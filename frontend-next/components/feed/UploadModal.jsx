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
      {/* Header — matching legacy modal-header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border sticky top-0 bg-surface flex-shrink-0">
        <h3 className="text-[15px] font-semibold">New Post</h3>
        <button onClick={handleClose} className="bg-transparent border-none text-[26px] cursor-pointer text-text leading-none">×</button>
      </div>

      {/* Content — matching legacy upload-area */}
      <div className="p-5">
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-[220px] object-cover rounded-[8px] mb-3 block"
          />
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-[12px] py-8 px-5 cursor-pointer text-center transition-colors hover:border-accent hover:bg-[#f5faff] relative"
          >
            <div className="flex justify-center mb-2.5">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-muted">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="font-semibold">Drag photo here</p>
            <p className="text-muted mt-1">or click to browse</p>
          </div>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          maxLength={2200}
          className="w-full border border-border rounded-[8px] p-2.5 text-[13px] outline-none resize-none text-text h-20 mt-3 block focus:border-accent"
        />

        <button
          onClick={handleSubmit}
          disabled={uploading || !file}
          className="w-full py-2.5 bg-accent text-white border-none rounded-[8px] text-[14px] font-semibold cursor-pointer mt-2.5 disabled:opacity-60"
        >
          {uploading ? 'Posting...' : 'Share Post'}
        </button>
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
