import { stringify } from "yaml";

// Pre-process the JSON to escape newlines in text fields before YAML conversion
const processTextFields = (obj) => {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(item => processTextFields(item));
    } else {
      const processed = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'text' && typeof value === 'string') {
          // Escape newlines and other special characters to preserve them as literal strings
          processed[key] = value.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        } else if (typeof value === 'object' && value !== null) {
          processed[key] = processTextFields(value);
        } else {
          processed[key] = value;
        }
      }
      return processed;
    }
  }
  return obj;
};

export const convertJsonToYamlDomain = (jsonData) => {
  const processedData = processTextFields(jsonData);
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