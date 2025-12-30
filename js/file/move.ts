import fs from "fs";

import { FileActionResponse } from "../../interfaces";
import { isValidFilePath } from "../util";

export function moveFile(current_path: string, new_path: string): FileActionResponse {
  if (!isValidFilePath(current_path) || !isValidFilePath(new_path)) {
    return {
      error: true,
      message: "path contains illegal characters",
    };
  }

  try {
    // Restore fs.mkdir if needed to be
    // const currentPath = buildContentFilePath(current_path);
    // const newPath = buildContentFilePath(new_path);
    //    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(current_path, new_path);

    return {
      error: false,
      message: "File moved successfully",
    };
  } catch (error) {
    console.log("Error moving file:", error);
    return {
      error: true,
      message: "Unable to move file",
    };
  }
}
