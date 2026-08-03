import React, { useState, useRef } from 'react';
import { GalleryItem } from '../../types';
import { Image, Camera, Upload, Trash2, Edit2, Check, Plus, Eye, Sparkles, X } from 'lucide-react';

interface GalleryViewProps {
  galleryItems: GalleryItem[];
  onAddGalleryItem: (item: GalleryItem) => void;
  onUpdateGalleryItem: (item: GalleryItem) => void;
  onDeleteGalleryItem: (id: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  galleryItems,
  onAddGalleryItem,
  onUpdateGalleryItem,
  onDeleteGalleryItem
}) => {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');

  // Camera capture modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startLiveCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Live camera access failed, falling back to camera file input:', err);
      // Fallback to camera input trigger
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  const captureCameraPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImageUrl(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert('Please select or capture an image for the gallery.');
      return;
    }

    const newItem: GalleryItem = {
      id: 'g-' + Date.now(),
      title: title.trim() || 'Trippy Mehfill Gallery Item',
      caption: caption.trim() || 'Delicious moments at Trippy Mehfill',
      image_url: imageUrl,
      created_at: new Date().toISOString().split('T')[0]
    };

    onAddGalleryItem(newItem);
    setTitle('');
    setCaption('');
    setImageUrl('');
  };

  const saveEdit = (item: GalleryItem) => {
    onUpdateGalleryItem({
      ...item,
      title: editTitle,
      caption: editCaption
    });
    setEditingId(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-gray-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-serif tracking-wide flex items-center gap-2">
            <Image className="w-7 h-7 text-[#C5A059]" />
            <span>Gallery Management</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage public landing page image gallery with local upload & camera capture. Real-time updates.
          </p>
        </div>

        <div className="bg-[#121212] border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs">
          <Sparkles className="w-4 h-4 text-[#C5A059]" />
          <span className="text-gray-400">Total Gallery Photos:</span>
          <span className="text-white font-extrabold text-sm">{galleryItems.length}</span>
        </div>
      </div>

      {/* Add New Gallery Image Panel */}
      <div className="bg-[#121212] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
        <h2 className="text-sm font-bold text-white font-serif flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>Upload New Gallery Image</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Image Pick / Camera Capture */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-300">Image Source</label>
              
              {imageUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-[#181818] aspect-video">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:text-rose-400"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-5 text-center bg-[#181818] space-y-3">
                  <div className="flex justify-center gap-3">
                    {/* Local File Selector */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-[#121212] border border-white/10 hover:border-[#C5A059] text-gray-200 font-bold text-xs rounded-xl flex items-center gap-2 transition"
                    >
                      <Upload className="w-4 h-4 text-[#C5A059]" />
                      <span>Choose File</span>
                    </button>

                    {/* Camera Capture */}
                    <button
                      type="button"
                      onClick={startLiveCamera}
                      className="px-4 py-2.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-[#C5A059]/20 transition"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Photo</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Supports JPG, PNG, WEBP from file gallery or live camera feed.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* URL Direct Fallback */}
              <div>
                <input
                  type="url"
                  placeholder="Or paste external image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            {/* Right Column: Title and Caption */}
            <div className="lg:col-span-2 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Title / Dish Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Special Hyderabadi Dum Handi Biryani"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full p-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Caption / Description</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Prepared with authentic spices, slow cooked on dum."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full p-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="py-3 px-6 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-2 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish to Gallery</span>
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* Live Camera Stream Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#121212] rounded-3xl p-5 max-w-lg w-full border border-white/10 space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#C5A059]" />
                <span>Live Camera Photo Capture</span>
              </h3>
              <button onClick={stopCamera} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/10">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={captureCameraPhoto}
                className="py-2.5 px-6 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg transition flex items-center gap-2 text-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="py-2.5 px-4 bg-[#181818] border border-white/10 text-gray-300 font-bold rounded-xl text-xs hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Gallery Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white font-serif tracking-wide">
          Live Public Gallery Grid ({galleryItems.length})
        </h2>

        {galleryItems.length === 0 ? (
          <div className="bg-[#121212] rounded-2xl p-10 text-center border border-white/10">
            <Image className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-white font-bold">No gallery images published yet.</p>
            <p className="text-xs text-gray-400 mt-1">Upload photos above to display them on the public gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#121212] rounded-2xl overflow-hidden border border-white/10 hover:border-[#C5A059]/40 shadow-xl transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video overflow-hidden bg-[#181818]">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-4 space-y-2">
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full p-2 bg-[#181818] border border-[#C5A059] rounded-lg text-xs text-white"
                        />
                        <textarea
                          rows={2}
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="w-full p-2 bg-[#181818] border border-[#C5A059] rounded-lg text-xs text-white"
                        />
                        <button
                          onClick={() => saveEdit(item)}
                          className="w-full py-1.5 bg-[#C5A059] text-black font-extrabold text-xs rounded-lg flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Changes
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-white text-sm">{item.title}</h3>
                        {item.caption && <p className="text-xs text-gray-400 line-clamp-2">{item.caption}</p>}
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between border-t border-white/10 text-xs text-gray-500 mt-2">
                  <span>{item.created_at}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditTitle(item.title);
                        setEditCaption(item.caption || '');
                      }}
                      className="p-1.5 rounded-lg bg-[#181818] text-gray-300 hover:text-[#C5A059] border border-white/10"
                      title="Edit Title / Caption"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.title}" from gallery?`)) {
                          onDeleteGalleryItem(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-[#181818] text-gray-300 hover:text-rose-400 border border-white/10"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
