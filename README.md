# cat-s

cat-s (Concatenate and Save) is a command-line tool for generating a summary of a repository, including a file structure sitemap and the content of each file. This tool is useful for quickly sharing code structures or preparing repository overviews.

![npm](https://img.shields.io/npm/v/cat-s)
![License](https://img.shields.io/npm/l/cat-s)

## Installation

To install cat-s globally, run:
```sh
npm install -g cat-s
```

## Usage

```sh
cats [options] <repoPath>
```

### Options

- `-o, --output <path>`: Specify the output file path (default: "repo_summary.md")
- `-i, --ignore <patterns>`: Specify patterns to ignore (comma-separated)
- `-m, --max-file-size <size>`: Maximum file size in KB to include (default: 1024)
- `-h, --help`: Display help information

### Example

To generate a summary of the current directory and save it to `repo-summary.md`, run:

```sh
cats /path/to/your/repo -o summary.md -i node_modules,dist -m 2048
```

This command will create a summary of the repository located at `/path/to/your/repo`, save it as `summary.md`, ignore `node_modules` and `dist` directories, and include files up to 2MB in size.

## Features

- Generate a file structure sitemap of the repository
- Include file contents in the summary
- Ignore specified patterns (e.g., node_modules, .git)
- Limit file size for inclusion
- Customizable output location

## Configuration

`cat-s` uses a configuration file located at `~/.cats/config.json`. This file allows you to customize the behavior of the tool. Below are the available configuration options:

#### **useGitignore**
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Determines whether to respect the `.gitignore` file when traversing directories. If set to `true`, files and directories specified in `.gitignore` will be excluded from the summary.

#### **include**
- **Type:** `array of strings`
- **Default:** `[".js", ".jsx", ".json", ".md", ".sh", ".ts", ".tsx", ".yaml", ".yml", "Dockerfile"]`
- **Description:** Specifies the file extensions to include in the summary. Only files with these extensions will be processed and included.

#### **exclude**
- **Type:** `array of strings`
- **Default:** `[".env", ".jpg", ".mp4", ".tsbuildinfo", "package-lock.json"]`
- **Description:** Specifies the file extensions to exclude from the summary. Files with these extensions will be ignored, even if they are listed in the `include` array.

#### **ignorePaths**
- **Type:** `array of strings`
- **Default:** `[".git", "build", "config", "dist", "node_modules", "pnpm-lock.yaml", "package-lock.json"]`
- **Description:** Specifies directories or file paths to ignore during traversal. These paths will be skipped entirely, regardless of other settings.

#### **outputDir**
- **Type:** `string`
- **Default:** `"~/Downloads/cats"`
- **Description:** Specifies the directory where the summary files will be saved. Supports the use of `~` to denote the user's home directory.

```json
{
  "useGitignore": false,
  "include": [".js", ".ts"],
  "exclude": [".log"],
  "ignorePaths": ["node_modules", "dist"],
  "outputDir": "/path/to/custom/output"
}
```

**Explanation:**
- **useGitignore:** Disabled, so `.gitignore` rules are not applied.
- **include:** Only `.js` and `.ts` files are included.
- **exclude:** `.log` files are excluded.
- **ignorePaths:** `node_modules` and `dist` directories are ignored.
- **outputDir:** Summary files will be saved to `/path/to/custom/output`.


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).
