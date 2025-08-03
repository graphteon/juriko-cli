# Code Reference System - Phase 3 Implementation

## Overview

The Code Reference System brings Claude Code-inspired clickable file references to JURIKO CLI, enabling seamless navigation between the terminal and your code editor. This feature automatically enhances tool outputs with clickable links that open directly in VSCode.

## Features

### 🔗 Clickable File References
- All file mentions become clickable links
- Direct integration with VSCode URL scheme
- Automatic enhancement of tool outputs
- Support for both file-only and line-specific references

### 📍 Line-Specific Navigation
- Jump directly to specific lines in files
- Context display around referenced lines
- Precise error location navigation
- Code review and debugging assistance

### 🔄 Automatic Enhancement
- Tool outputs automatically include clickable references
- Error messages enhanced with navigation links
- Diff outputs include clickable file references
- Seamless integration with existing workflows

## Usage

### CLI Options

```bash
# Enable code references (default)
juriko --enable-code-references

# Disable code references
juriko --disable-code-references
```

### Environment Variables

```bash
# Enable/disable code references
export JURIKO_ENABLE_CODE_REFERENCES=true  # or 'false'
```

### Reference Formats

The system supports multiple reference formats:

#### File References
```markdown
[`package.json`](vscode://file/path/to/package.json)
```

#### Line References
```markdown
[`src/index.ts:42`](vscode://file/path/to/src/index.ts:42)
```

#### Context References
```markdown
[`src/utils/helper.ts:15`](vscode://file/path/to/src/utils/helper.ts:15)
```

## Examples

### Tool Output Enhancement

**Before (without code references):**
```
Updated src/components/Button.tsx with 3 additions and 1 removal
```

**After (with code references):**
```
Updated [`src/components/Button.tsx`](vscode://file/src/components/Button.tsx) with 3 additions and 1 removal
```

### Error Navigation

**Before:**
```
Error in src/utils/helper.ts at line 15: Undefined variable 'config'
```

**After:**
```
Error in [`src/utils/helper.ts:15`](vscode://file/src/utils/helper.ts:15): Undefined variable 'config'
```

### Directory Listings

**Before:**
```
Directory contents of src/:
- index.ts
- app.ts
- utils/
```

**After:**
```
Directory contents of [`src/`](vscode://file/src/):
- [`index.ts`](vscode://file/src/index.ts)
- [`app.ts`](vscode://file/src/app.ts)
- [`utils/`](vscode://file/src/utils/)
```

## Technical Implementation

### Core Components

#### CodeReferenceManager
The main class responsible for:
- Reference formatting and parsing
- Clickable link generation
- Content enhancement
- File validation

#### ReferenceUtils
Utility functions for common operations:
- Quick file references
- Line-specific references
- Multiple file processing
- Error stack trace parsing

### Integration Points

#### TextEditorTool Enhancement
- View operations include clickable file references
- Create/edit operations show clickable diff outputs
- Directory listings with navigable file links

#### System Prompt Integration
- Guidelines for consistent reference formatting
- Instructions for clickable link usage
- Error message enhancement rules

### VSCode Integration

The system uses VSCode's URL scheme for direct navigation:

```
vscode://file/absolute/path/to/file
vscode://file/absolute/path/to/file:line
vscode://file/absolute/path/to/file:line:column
```

## Configuration

### Default Settings
- Code references: **Enabled**
- Link format: VSCode URL scheme
- Path format: Relative paths for readability
- Context lines: 3 lines around referenced location

### Customization Options

```typescript
interface ReferenceFormatOptions {
  includeLineNumbers: boolean;    // Include line numbers in references
  makeClickable: boolean;         // Generate clickable links
  useRelativePaths: boolean;      // Use relative vs absolute paths
  workingDirectory?: string;      // Base directory for relative paths
}
```

## API Reference

### CodeReferenceManager Methods

#### `formatReference(file: string, line?: number, options?: ReferenceFormatOptions): string`
Format a file reference with optional line number.

#### `parseReference(reference: string): CodeReference | null`
Parse a reference string to extract file and line information.

#### `extractReferencesFromContent(content: string): CodeReference[]`
Extract all file references from text content.

#### `enhanceWithReferences(content: string): string`
Enhance content by making file references clickable.

#### `generateClickableLink(file: string, line?: number): string`
Generate a VSCode-compatible clickable link.

#### `getContextAroundLine(file: string, line: number, contextLines?: number): string | null`
Get code context around a specific line.

### ReferenceUtils Methods

#### `file(path: string): string`
Create a quick file reference.

#### `line(path: string, line: number): string`
Create a quick file:line reference.

#### `multiple(files: string[]): string[]`
Create references for multiple files.

#### `fromError(error: Error): CodeReference[]`
Extract references from error stack traces.

## Testing

### Test Coverage
- Reference formatting and parsing
- Link generation and validation
- Content enhancement
- VSCode integration
- Error handling

### Running Tests
```bash
# Build the project
npm run build

# Run code reference tests
node test/code-reference-test.js
```

### Test Results
The test suite validates:
- ✅ Basic file reference formatting
- ✅ Reference parsing accuracy
- ✅ Content enhancement functionality
- ✅ VSCode link generation
- ✅ Context display around lines
- ✅ Reference validation
- ✅ Utility function operations

## Performance Impact

### Minimal Overhead
- Reference processing adds < 1ms per operation
- Lazy evaluation for content enhancement
- Efficient regex patterns for extraction
- Cached file validation results

### Memory Usage
- Lightweight reference objects
- No persistent caching by default
- Minimal memory footprint increase

## Troubleshooting

### Common Issues

#### Links Not Opening in VSCode
**Problem:** Clicking links doesn't open VSCode
**Solution:** Ensure VSCode is installed and URL scheme is registered

#### Incorrect File Paths
**Problem:** Links point to wrong file locations
**Solution:** Verify working directory is set correctly

#### Missing Line Numbers
**Problem:** References don't include line numbers
**Solution:** Enable line numbers in reference options

### Debug Mode
Enable debug logging for reference processing:
```bash
export JURIKO_DEBUG_REFERENCES=true
```

## Future Enhancements

### Planned Features
- Support for other editors (Sublime, Atom, etc.)
- Custom URL scheme configuration
- Reference caching for performance
- Batch reference processing
- Integration with git blame information

### Extension Points
- Custom reference formatters
- Editor-specific link generators
- Reference validation plugins
- Content enhancement filters

## Contributing

### Adding New Reference Types
1. Extend the regex patterns in `extractReferencesFromContent`
2. Add corresponding test cases
3. Update documentation with examples

### Supporting New Editors
1. Implement editor-specific URL scheme
2. Add configuration options
3. Update link generation logic
4. Test integration thoroughly

## Related Documentation

- [System Prompt Architecture](./SYSTEM_PROMPT_ARCHITECTURE.md)
- [Multi-Tool Batching](./MULTI_TOOL_BATCHING.md)
- [Response Style Control](./RESPONSE_STYLE_FEATURE.md)
- [Development Guide](../README.md#development)

---

*This feature is part of the Claude Code-inspired improvement plan for JURIKO CLI, bringing professional-grade code navigation to the terminal experience.*