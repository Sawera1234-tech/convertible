// Ways to get finished MP3s out of the app. Each returns what actually happened,
// so the UI never claims a save that did not succeed.

export type SaveResult = "saved-folder" | "shared" | "downloaded" | "cancelled";

export function downloadBlob(blob: Blob, name: string) {
  const file = blob.type === "audio/mpeg" ? blob : new Blob([blob], { type: "audio/mpeg" });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const canPickFolder = () => typeof window !== "undefined" && "showDirectoryPicker" in window;
export const canShareFiles = () => {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "t.mp3", { type: "audio/mpeg" })] });
  } catch {
    return false;
  }
};

/** Write every file into a folder the user picks (e.g. Music). Desktop Chrome/Edge. */
export async function saveToFolder(files: { name: string; blob: Blob }[]): Promise<SaveResult> {
  let dir: any;
  try {
    dir = await (window as any).showDirectoryPicker({ id: "v2mp3-music", mode: "readwrite", startIn: "music" });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
    throw e;
  }
  for (const f of files) {
    const h = await dir.getFileHandle(f.name, { create: true });
    const w = await h.createWritable();
    await w.write(f.blob);
    await w.close();
  }
  return "saved-folder";
}

/** Android: open the system share sheet so the user can save into Files/Music. */
export async function shareFiles(files: { name: string; blob: Blob }[]): Promise<SaveResult> {
  const list = files.map((f) => new File([f.blob], f.name, { type: "audio/mpeg" }));
  try {
    await navigator.share({ files: list, title: list.length > 1 ? "MP3 files" : list[0]!.name });
    return "shared";
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
    throw e;
  }
}
