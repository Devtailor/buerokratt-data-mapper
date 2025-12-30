import fs from "fs";
import path from "path";

import { FileActionResponse } from "../../interfaces";
import { isValidFilePath } from "../util";

export function copyFile(current_path: string, new_path: string): FileActionResponse {
  if (!isValidFilePath(current_path) || !isValidFilePath(new_path)) {
    return {
      error: true,
      message: "path contains illegal characters",
    };
  }

  try {
    fs.mkdirSync(path.dirname(new_path), { recursive: true });
    fs.copyFileSync(current_path, new_path);

    return {
      error: false,
      message: "File copied successfully",
    };
  } catch (error) {
    console.error("Error copying file:", error);
    return {
      error: true,
      message: "Unable to copy file",
    };
  }
}
