#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const yaml = require('js-yaml');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);

    // Check if --all flag is present
    if (args.includes('--all')) {
        const configIndex = args.indexOf('--config');
        return {
            all: true,
            configFile: (configIndex !== -1 && args[configIndex + 1]) ? args[configIndex + 1] : 'config.yaml'
        };
    }

    if (args.length < 2) {
        console.log('Usage: node md2pdf.js <input.md> <output.pdf> [--config config.yaml]');
        console.log('   or: node md2pdf.js --all [--config config.yaml]');
        console.log('\nExamples:');
        console.log('  node md2pdf.js input.md output.pdf');
        console.log('  node md2pdf.js input.md output.pdf --config custom_config.yaml');
        console.log('  node md2pdf.js --all  # Convert all .md files to .pdf');
        process.exit(1);
    }

    const config = {
        input: args[0],
        output: args[1],
        configFile: 'config.yaml'
    };

    const configIndex = args.indexOf('--config');
    if (configIndex !== -1 && args[configIndex + 1]) {
        config.configFile = args[configIndex + 1];
    }

    return config;
}

// Load YAML config
function loadConfig(configPath) {
    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        return yaml.load(fileContents);
    } catch (e) {
        console.error(`Error loading config file '${configPath}':`, e.message);
        process.exit(1);
    }
}

// Generate CSS from config
function generateCSS(config) {
    const style = config.style || {};

    const fontFamily = style.font_family || 'Arial, sans-serif';
    const fontSize = style.font_size || '12pt';
    const lineHeight = style.line_height || '1.6';
    const textColor = style.text_color || '#333333';
    const backgroundColor = style.background_color || '#ffffff';
    const headingColor = style.heading_color || '#2c3e50';
    const headingFontFamily = style.heading_font_family || fontFamily;
    const linkColor = style.link_color || '#3498db';

    const margins = style.margins || {};
    const marginTop = margins.top || '2.5cm';
    const marginBottom = margins.bottom || '2.5cm';
    const marginLeft = margins.left || '2cm';
    const marginRight = margins.right || '2cm';

    const codeBg = style.code_background || '#f4f4f4';
    const codeColor = style.code_color || '#c7254e';
    const codeFont = style.code_font_family || 'Courier New, monospace';

    // Heading sizes
    const headingSizes = style.heading_sizes || {};
    const h1Size = headingSizes.h1 || '2.5em';
    const h2Size = headingSizes.h2 || '2em';
    const h3Size = headingSizes.h3 || '1.5em';
    const h4Size = headingSizes.h4 || '1.2em';
    const h5Size = headingSizes.h5 || '1em';
    const h6Size = headingSizes.h6 || '0.9em';

    // Spacing
    const spacing = style.spacing || {};
    const headingTop = spacing.heading_top || '1.5em';
    const headingBottom = spacing.heading_bottom || '0.5em';
    const paragraphBottom = spacing.paragraph_bottom || '1em';
    const listBottom = spacing.list_bottom || '1em';
    const listItemBottom = spacing.list_item_bottom || '0.5em';

    return `
        @page {
            margin: 0;
            size: A4;
        }

        html {
            background-color: ${backgroundColor};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        body {
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: ${lineHeight};
            color: ${textColor};
            background-color: ${backgroundColor};
            margin: 0;
            padding: ${marginTop} ${marginRight} ${marginBottom} ${marginLeft};
            box-sizing: border-box;
            min-height: 100vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: ${headingFontFamily};
            color: ${headingColor};
            margin-top: ${headingTop};
            margin-bottom: ${headingBottom};
        }

        h1 {
            font-size: ${h1Size};
            border-bottom: 2px solid ${headingColor};
            padding-bottom: 0.3em;
        }

        h2 {
            font-size: ${h2Size};
            color: ${textColor};
        }

        h3 {
            font-size: ${h3Size};
            margin-bottom: 0;
        }

        h4 {
            font-size: ${h4Size};
            margin-top: 0.5em;
        }

        h5 {
            font-size: ${h5Size};
        }

        h6 {
            font-size: ${h6Size};
        }

        p {
            margin-bottom: ${paragraphBottom};
        }

        a {
            color: ${linkColor};
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        ul, ol {
            margin-bottom: ${listBottom};
            padding-left: 2em;
        }

        li {
            margin-bottom: ${listItemBottom};
        }

        blockquote {
            border-left: 4px solid ${linkColor};
            padding: 0.5em;
            padding-left: 1em;
            margin-top: 0;
            margin-bottom: 0;
            margin-left: 0;
            font-style: italic;
            color: ${linkColor};
            background-color: #FAFAFA;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        blockquote ul, blockquote ol {
            list-style-type: circle;
            color: ${linkColor};
        }

        blockquote li {
            color: ${linkColor};
        }

        code {
            font-family: ${codeFont};
            background-color: ${codeBg};
            color: ${codeColor};
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
        }

        pre {
            background-color: ${codeBg};
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
            margin-bottom: 1em;
        }

        pre code {
            background-color: transparent;
            padding: 0;
            color: ${textColor};
        }

        hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 2em 0;
        }

        strong {
            font-weight: bold;
        }

        em {
            font-style: italic;
        }
    `;
}

// Convert markdown to PDF
async function convertMarkdownToPDF(inputFile, outputFile, configFile) {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file '${inputFile}' not found.`);
        process.exit(1);
    }

    // Load config
    const config = loadConfig(configFile);

    // Get margins from config
    const margins = config.style?.margins || {};
    const marginTop = margins.top || '2cm';
    const marginBottom = margins.bottom || '2cm';
    const marginLeft = margins.left || '1cm';
    const marginRight = margins.right || '1cm';

    // Read markdown file
    const markdownText = fs.readFileSync(inputFile, 'utf8');

    // Convert markdown to HTML
    const htmlContent = marked(markdownText);

    // Generate CSS
    const css = generateCSS(config);

    // Get Google Fonts URL if specified
    const googleFontsUrl = config.style?.google_fonts_url || '';
    const fontLink = googleFontsUrl ? `<link href="${googleFontsUrl}" rel="stylesheet">` : '';

    // Create full HTML document
    const fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    ${fontLink}
    <style>
        ${css}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
    `;

    // Launch puppeteer and generate PDF
    console.log('Generating PDF...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

    await page.pdf({
        path: outputFile,
        format: 'A4',
        printBackground: true,
        margin: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    });

    await browser.close();

    console.log(`✓ PDF successfully created: ${outputFile}`);
}

// Get all markdown files in current directory
function getAllMarkdownFiles() {
    const excludeFiles = ['example.md', 'README.md'];

    return fs.readdirSync('.')
        .filter(file => file.endsWith('.md') && !excludeFiles.includes(file))
        .map(file => ({
            input: file,
            output: file.replace('.md', '.pdf')
        }));
}

// Main execution
async function main() {
    const args = parseArgs();

    if (args.all) {
        const files = getAllMarkdownFiles();

        if (files.length === 0) {
            console.log('No .md files found in the current directory.');
            return;
        }

        console.log(`Found ${files.length} markdown file(s) to convert:\n`);

        for (const file of files) {
            console.log(`Converting ${file.input} -> ${file.output}`);
            await convertMarkdownToPDF(file.input, file.output, args.configFile);
        }

        console.log(`\n✓ All ${files.length} file(s) converted successfully!`);
    } else {
        await convertMarkdownToPDF(args.input, args.output, args.configFile);
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
