import { useRef, useState } from "react";

export default function PdfUploader({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file) => file && !disabled && onFile(file);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current.click()}
      onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files[0]);
      }}
      className={`rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition
        ${dragging ? "border-indigo-400 bg-indigo-500/10" : "border-slate-700 bg-slate-900 hover:border-slate-500"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <div className="text-5xl mb-4">📄</div>
      <p className="font-semibold text-lg">Drop a PDF here to chat with it</p>
      <p className="text-sm text-slate-400 mt-1">or click to browse · PDF with selectable text · max 4 MB</p>
    </div>
  );
}
