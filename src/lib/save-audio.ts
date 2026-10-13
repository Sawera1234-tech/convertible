// Ways to get finished MP3s out of the app. Each returns what actually happened,
// so the UI never claims a save that did not succeed.

export type SaveResult = "saved-folder" | "shared" | "downloaded" | "cancelled";

export function downloadBlob(blob: Blob, name: string) {
  const safe = name.toLowerCase().endsWith(".mp3") || name.toLowerCase().endsWith(".zip") ? name : `${name}.mp3`;
  const type = safe.toLowerCase().endsWith(".zip") ? "application/zip" : "audio/mpeg";
  // A named File (not an anonymous Blob) keeps the original name on browsers that
  // otherwise fall back to a numeric blob id when saving.
  const file = new File([blob], safe, { type });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Keep the link and URL alive long enough for the browser to read the filename.
  setTimeout(() => a.remove(), 5_000);
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
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
    if (!list.length) return "cancelled";
    await navigator.share({ files: list, title: list.length > 1 ? "MP3 files" : list[0]?.name ?? "MP3 file" });
    return "shared";
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
    throw e;
  }
}
