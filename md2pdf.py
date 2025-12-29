#!/usr/bin/env python3
"""
Markdown to PDF Converter
Converts Markdown files to styled PDF documents using a config file.
"""

import argparse
import sys
from pathlib import Path
import markdown
from weasyprint import HTML, CSS
import yaml


def load_config(config_path):
    """Load styling configuration from YAML file."""
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except FileNotFoundError:
        print(f"Error: Config file '{config_path}' not found.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing config file: {e}")
        sys.exit(1)


def generate_css(config):
    """Generate CSS from configuration."""
    style = config.get('style', {})

    # Extract configuration values with defaults
    font_family = style.get('font_family', 'Arial, sans-serif')
    font_size = style.get('font_size', '12pt')
    line_height = style.get('line_height', '1.6')
    text_color = style.get('text_color', '#333333')
    background_color = style.get('background_color', '#ffffff')

    heading_color = style.get('heading_color', '#2c3e50')
    heading_font_family = style.get('heading_font_family', font_family)

    link_color = style.get('link_color', '#3498db')

    margins = style.get('margins', {})
    margin_top = margins.get('top', '2.5cm')
    margin_bottom = margins.get('bottom', '2.5cm')
    margin_left = margins.get('left', '2cm')
    margin_right = margins.get('right', '2cm')

    code_bg = style.get('code_background', '#f4f4f4')
    code_color = style.get('code_color', '#c7254e')
    code_font = style.get('code_font_family', 'Courier New, monospace')

    css = f"""
    @page {{
        margin-top: {margin_top};
        margin-bottom: {margin_bottom};
        margin-left: {margin_left};
        margin-right: {margin_right};
        size: A4;
    }}

    body {{
        font-family: {font_family};
        font-size: {font_size};
        line-height: {line_height};
        color: {text_color};
        background-color: {background_color};
    }}

    h1, h2, h3, h4, h5, h6 {{
        font-family: {heading_font_family};
        color: {heading_color};
        margin-top: 1.5em;
        margin-bottom: 0.5em;
    }}

    h1 {{
        font-size: 2.5em;
        border-bottom: 2px solid {heading_color};
        padding-bottom: 0.3em;
    }}

    h2 {{
        font-size: 2em;
        margin-bottom: 0em;
    }}

    h3 {{
        font-size: 1.5em;
        margin-bottom: 0em;   
    }}

    p {{
        margin-bottom: 1em;
    }}

    a {{
        color: {link_color};
        text-decoration: none;
    }}

    a:hover {{
        text-decoration: underline;
    }}

    ul, ol {{
        margin-bottom: 1em;
        padding-left: 2em;
    }}

    li {{
        margin-bottom: 0.5em;
    }}

    blockquote {{
        border-left: 4px solid {link_color};
        padding-left: 1em;
        margin-left: 0;
        font-style: italic;
        color: #666;
    }}

    code {{
        font-family: {code_font};
        background-color: {code_bg};
        color: {code_color};
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.9em;
    }}

    pre {{
        background-color: {code_bg};
        padding: 1em;
        border-radius: 5px;
        overflow-x: auto;
        margin-bottom: 1em;
    }}

    pre code {{
        background-color: transparent;
        padding: 0;
        color: {text_color};
    }}

    hr {{
        border: none;
        border-top: 1px solid #ddd;
        margin: 2em 0;
    }}

    strong {{
        font-weight: bold;
    }}

    em {{
        font-style: italic;
    }}
    """

    return css


def convert_markdown_to_pdf(input_file, output_file, config_file):
    """Convert Markdown file to PDF with custom styling."""

    # Check if input file exists
    if not Path(input_file).exists():
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)

    # Load configuration
    config = load_config(config_file)

    # Read Markdown file
    with open(input_file, 'r', encoding='utf-8') as f:
        markdown_text = f.read()

    # Convert Markdown to HTML
    html_content = markdown.markdown(
        markdown_text,
        extensions=['fenced_code', 'codehilite', 'nl2br']
    )

    # Wrap HTML in a complete document
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Generate CSS from config
    css_string = generate_css(config)

    # Convert to PDF
    html = HTML(string=full_html)
    css = CSS(string=css_string)
    html.write_pdf(output_file, stylesheets=[css])

    print(f"✓ PDF successfully created: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Convert Markdown files to PDF with custom styling.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python md2pdf.py input.md output.pdf
  python md2pdf.py input.md output.pdf --config custom_config.yaml
        """
    )

    parser.add_argument('input', help='Input Markdown file')
    parser.add_argument('output', help='Output PDF file')
    parser.add_argument(
        '--config',
        '-c',
        default='config.yaml',
        help='Config file for styling (default: config.yaml)'
    )

    args = parser.parse_args()

    convert_markdown_to_pdf(args.input, args.output, args.config)


if __name__ == '__main__':
    main()
