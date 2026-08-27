'use client';

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function UploadModal({ isOpen, onClose, onPostCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const { showToast } = useToast();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) { showToast('Please select an image'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('caption', caption.trim());
      await api.upload('/posts', fd);
      showToast('Post created!');
      onPostCreated?.();
      handleClose();
    } catch (err) {
      showToast(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <button onClick={handleClose} className="text-text bg-transparent border-none cursor-pointer text-sm font-semibold">Cancel</button>
        <h3 className="text-base font-bold">New Post</h3>
        <button
          onClick={handleSubmit}
          disabled={uploading || !file}
          className="text-accent bg-transparent border-none cursor-pointer text-sm font-semibold disabled:opacity-50"
        >
          {uploading ? 'Posting...' : 'Share'}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full rounded-lg max-h-80 object-contain bg-surface2" />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white border-none rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-sm"
            >×</button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl py-16 flex flex-col items-center gap-3 cursor-pointer hover:border-accent transition-colors"
          >
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
            </svg>
            <p className="text-muted text-sm">Tap to select a photo</p>
          </div>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          maxLength={2200}
          rows={3}
          className="w-full border border-border rounded-lg p-3 text-sm outline-none resize-none bg-surface2 text-text placeholder:text-muted"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files[0])}
        className="hidden"
      />
    </Modal>
  );
}
