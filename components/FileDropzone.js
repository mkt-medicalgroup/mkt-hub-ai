'use client';

import { useCallback, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// bucket: nome del bucket Supabase Storage (va creato una volta, vedi README)
// pathPrefix: cartella logica dentro al bucket (es. per utente o per progetto)
export default function FileDropzone({ bucket, pathPrefix, onFilesChange }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const uploadFiles = useCallback(
    async (fileList) => {
      setUploading(true);
      const uploaded = [];

      for (const file of Array.from(fileList)) {
        const path = `${pathPrefix}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true,
        });

        if (!error) {
          uploaded.push({ name: file.name, path });
        }
      }

      setFiles((prev) => {
        const next = [...prev, ...uploaded];
        onFilesChange?.(next);
        return next;
      });
      setUploading(false);
    },
    [bucket, pathPrefix, onFilesChange]
  );

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  function removeFile(path) {
    setFiles((prev) => {
      const next = prev.filter((f) => f.path !== path);
      onFilesChange?.(next);
      return next;
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl px-4 py-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-accent bg-accentSoft' : 'border-border hover:border-muted'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
        />
        <p className="text-sm text-muted">
          {uploading
            ? 'Caricamento in corso...'
            : 'Trascina qui i file del brand, o clicca per selezionarli'}
        </p>
        <p className="text-xs text-muted mt-1 font-mono">
          tono di voce · brand manual · linee guida
        </p>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f) => (
            <li
              key={f.path}
              className="flex items-center justify-between bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            >
              <span className="truncate">{f.name}</span>
              <button
                onClick={() => removeFile(f.path)}
                className="text-muted hover:text-accent text-xs font-mono ml-3"
              >
                rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
