import { stringify } from "yaml";

export const convertJsonToYamlDomain = (jsonData) => {
  const processedData = escapeTextFieldNewlines(jsonData);
  let convertedYaml = stringify(processedData, { lineWidth: 0 });
  const lines = convertedYaml.split("\n");

  const processedLines = lines.map((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("text:") || trimmedLine.startsWith("- text:")) {
      const index = line.indexOf(":");
      const prefix = line.substring(0, index);
      const value = line.substring(index + 1).trim();

      if (value.startsWith("'") && value.endsWith("'")) {
        const innerValue = value.slice(1, -1).replace(/"/g, '\\"');
        return `${prefix}: "${innerValue}"`;
      }

      if (!value.startsWith('"') || !value.endsWith('"')) {
        const escapedValue = value.replace(/"/g, '\\"');
        return `${prefix}: "${escapedValue}"`;
      }
      return line;
    }
    return line;
  });

  return processedLines.join("\n");
};

// Pre-process the JSON to escape newlines in text fields before YAML conversion
export const escapeTextFieldNewlines = (obj) => {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(item => escapeTextFieldNewlines(item));
    } else {
      const processed = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'text' && typeof value === 'string') {
          // Escape newlines to preserve them as literal strings
          processed[key] = value.replace(/\n/g, '\\n');
        } else if (typeof value === 'object' && value !== null) {
          processed[key] = escapeTextFieldNewlines(value);
        } else {
          processed[key] = value;
        }
      }
      return processed;
    }
  }
  return obj;
};