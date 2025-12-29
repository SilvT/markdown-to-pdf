# Markdown to PDF Converter

A simple Python tool that converts Markdown files to styled PDF documents with customizable formatting.

## Features

- Convert Markdown (.md) files to PDF
- Customize styling via YAML config file
- Support for:
  - Headings (H1-H6)
  - Bold and italic text
  - Lists (ordered and unordered)
  - Links
  - Code blocks and inline code
  - Blockquotes
  - Horizontal rules

## Installation

Install the required Python packages:

```bash
pip install markdown weasyprint pyyaml
```

**Note**: WeasyPrint requires some system dependencies. If you encounter issues:

- **macOS**: `brew install python3 cairo pango gdk-pixbuf libffi`
- **Linux**: `apt-get install python3-dev python3-pip python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info`
- **Windows**: Follow [WeasyPrint Windows installation guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows)

## Usage

### Basic Usage

```bash
python md2pdf.py input.md output.pdf
```

This will use the default `config.yaml` file for styling.

### Custom Config File

```bash
python md2pdf.py input.md output.pdf --config custom_config.yaml
```

### Example

Try the included example:

```bash
python md2pdf.py example.md example.pdf
```

## Configuration

Edit `config.yaml` to customize the PDF styling:

```yaml
style:
  # Font settings
  font_family: 'Georgia, serif'
  font_size: '12pt'
  line_height: '1.6'

  # Colors
  text_color: '#333333'
  heading_color: '#2c3e50'
  link_color: '#3498db'

  # Page margins
  margins:
    top: '2.5cm'
    bottom: '2.5cm'
    left: '2cm'
    right: '2cm'

  # Code styling
  code_background: '#f4f4f4'
  code_color: '#c7254e'
```

### Configuration Options

| Option | Description | Example |
|--------|-------------|---------|
| `font_family` | Main text font | `'Arial, sans-serif'` |
| `font_size` | Base font size | `'12pt'` |
| `line_height` | Line spacing | `'1.6'` |
| `text_color` | Main text color | `'#333333'` |
| `background_color` | Page background | `'#ffffff'` |
| `heading_color` | Color for headings | `'#2c3e50'` |
| `heading_font_family` | Font for headings | `'Georgia, serif'` |
| `link_color` | Hyperlink color | `'#3498db'` |
| `margins.top/bottom/left/right` | Page margins | `'2cm'` |
| `code_background` | Code block background | `'#f4f4f4'` |
| `code_color` | Inline code color | `'#c7254e'` |
| `code_font_family` | Font for code | `'Courier New, monospace'` |

## Files

- `md2pdf.py` - Main conversion script
- `config.yaml` - Default styling configuration
- `example.md` - Sample Markdown file for testing

## Running it
Run via terminal
```
npm run build
```

## Troubleshooting

**Error: Config file not found**
- Make sure `config.yaml` exists in the same directory, or specify a custom config with `--config`

**Error: Input file not found**
- Check that the Markdown file path is correct

**WeasyPrint installation issues**
- Install system dependencies (see Installation section above)
- On macOS with Apple Silicon, you may need: `brew install cairo pango`

## License

Free to use and modify.
