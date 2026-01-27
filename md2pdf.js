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

// Generate header template
function generateHeaderTemplate(config) {
    const header = config.header || {};
    if (!header.enabled) return '';

    const fontSize = header.font_size || '8pt';
    const text = header.text || '';
    const fontFamily = config.style?.font_family || 'Arial, sans-serif';

    // If first_page_only, use CSS to hide on pages after first
    const hideAfterFirst = header.first_page_only
        ? `<style>
            .header-content { display: none; }
            .first-page .header-content { display: block; }
           </style>
           <script>
            if (window.pageNumber === 1) {
                document.body.classList.add('first-page');
            }
           </script>`
        : '';

    // Use pageNumber class to conditionally show
    const visibilityStyle = header.first_page_only
        ? 'style="display: none;" class="header-text" data-first-page-only="true"'
        : '';

    return `
        <div style="width: 100%; font-size: ${fontSize}; font-family: ${fontFamily}; padding: 0 1cm;">
            <span class="pageNumber" style="display: none;"></span>
            <span ${visibilityStyle}>${text}</span>
        </div>
        <script>
            // Show header only on first page
            const pageNum = document.querySelector('.pageNumber');
            const headerText = document.querySelector('.header-text');
            if (headerText && pageNum) {
                const isFirstPage = pageNum.textContent === '1';
                headerText.style.display = isFirstPage ? 'inline' : 'none';
            }
        </script>
    `;
}

// Generate footer template
function generateFooterTemplate(config) {
    const footer = config.footer || {};
    if (!footer.enabled) return '';

    const fontSize = footer.font_size || '8pt';
    const position = footer.position || 'right';
    const fontFamily = config.style?.font_family || 'Arial, sans-serif';

    let justifyContent = 'flex-end'; // default right
    if (position === 'left') justifyContent = 'flex-start';
    if (position === 'center') justifyContent = 'center';

    const pageNumber = footer.show_page_number
        ? '<span class="pageNumber"></span>'
        : '';

    return `
        <div style="width: 100%; font-size: ${fontSize}; font-family: ${fontFamily}; display: flex; justify-content: ${justifyContent}; padding: 0 1cm;">
            ${pageNumber}
        </div>
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

    // Check if we need a first-page-only header (injected into body)
    const headerConfig = config.header || {};
    let firstPageHeader = '';
    if (headerConfig.enabled && headerConfig.first_page_only) {
        const headerFontSize = headerConfig.font_size || '8pt';
        const headerText = headerConfig.text || '';
        const headerMarginBottom = headerConfig.margin_bottom || '1rem';
        // Use normal document flow (not fixed) so it only appears once at the top
        firstPageHeader = `
            <div class="first-page-header" style="
                font-size: ${headerFontSize};
                color: #000;
                margin-bottom: ${headerMarginBottom};
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            ">${headerText}</div>
        `;
    }

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
    ${firstPageHeader}
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

    // Prepare PDF options
    const pdfOptions = {
        path: outputFile,
        format: 'A4',
        printBackground: true,
        margin: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    };

    // Add header/footer if configured
    const footerConfig = config.footer || {};

    if (headerConfig.enabled || footerConfig.enabled) {
        pdfOptions.displayHeaderFooter = true;
        pdfOptions.margin.top = (headerConfig.enabled && !headerConfig.first_page_only) ? '1.5cm' : 0;
        pdfOptions.margin.bottom = footerConfig.enabled ? '1.5cm' : 0;

        // Header template - show only on first page if configured
        if (headerConfig.enabled) {
            const fontSize = headerConfig.font_size || '8pt';
            const text = headerConfig.text || '';
            const fontFamily = config.style?.font_family || 'Arial, sans-serif';

            if (headerConfig.first_page_only) {
                // Puppeteer doesn't run JS in header/footer, so we use CSS trick
                // The .pageNumber class is replaced with the actual page number by Puppeteer
                // We can't conditionally hide based on it directly, so we inject the header into the HTML body instead
                pdfOptions.headerTemplate = '<div></div>';
            } else {
                pdfOptions.headerTemplate = `
                    <div style="width: 100%; font-size: ${fontSize}; font-family: ${fontFamily}; padding: 0.5cm 1cm; color: #000;">
                        ${text}
                    </div>
                `;
            }
        } else {
            pdfOptions.headerTemplate = '<div></div>';
        }

        // Footer template
        if (footerConfig.enabled) {
            pdfOptions.footerTemplate = generateFooterTemplate(config);
        } else {
            pdfOptions.footerTemplate = '<div></div>';
        }
    }

    await page.pdf(pdfOptions);

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
