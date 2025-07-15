import { stringify } from "yaml";

export const convertJsonToYamlDomain = (jsonData) => {
  let convertedYaml = stringify(jsonData, { lineWidth: 0 });
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