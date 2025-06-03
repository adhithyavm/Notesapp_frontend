import React, { useState, useEffect, useRef } from 'react';
import styles from './App.module.css';
import { PlusCircle, Trash2, Image, Search, AlertTriangle, LogOut, X } from 'lucide-react'; // Added X icon for close button
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Notespage() {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [tempNoteData, setTempNoteData] = useState({});
  const [deletingImages, setDeletingImages] = useState(new Set());
  const [selectedImage, setSelectedImage] = useState(null); // State for selected image
  const debounceRef = useRef(null);
  const isDeletingRef = useRef(false);
  const navigate = useNavigate();

  // Logout function
  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/');
  }

  // Handle image click to open modal
  function handleImageClick(image) {
    setSelectedImage(image);
  }

  // Handle closing the modal
  function handleCloseModal() {
    setSelectedImage(null);
  }

  // Handle Escape key to close modal
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && selectedImage) {
        handleCloseModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (activeNote) {
      const currentNote = notes.find(note => note._id === activeNote);
      setTempNoteData({
        title: currentNote?.title || '',
        content: currentNote?.content || '',
      });
    }
  }, [activeNote, notes]);

  useEffect(() => {
    if (!activeNote) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!isDeletingRef.current) {
        updateNote(activeNote, tempNoteData);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [tempNoteData, activeNote]);

  async function fetchNotes() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      const response = await axios.get('http://localhost:5000/api/notes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(response.data);
    } catch (err) {
      console.error('Fetch notes error:', err);
      setError(err.response?.data?.error || 'Failed to fetch notes');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }

  async function addNote() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      const newNote = {
        title: 'Untitled Note',
        content: '',
        color: getRandomColor(),
      };

      const response = await axios.post('http://localhost:5000/api/notes', newNote, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes([...notes, response.data]);
      setActiveNote(response.data._id);
    } catch (err) {
      console.error('Add note error:', err);
      setError(err.response?.data?.error || 'Failed to create note');
    }
  }

  async function deleteNote(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      await axios.delete(`http://localhost:5000/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(notes.filter(note => note._id !== id));
      if (activeNote === id) setActiveNote(null);
    } catch (err) {
      console.error('Delete note error:', err);
      setError(err.response?.data?.error || 'Failed to delete note');
    }
  }

  async function updateNote(id, updates) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      const response = await axios.put(`http://localhost:5000/api/notes/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(prevNotes => prevNotes.map(note => (note._id === id ? response.data : note)));
    } catch (err) {
      console.error('Update note error:', err);
      setError(err.response?.data?.error || 'Failed to update note');
    }
  }

  async function addImage(id) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const token = localStorage.getItem('token');
          if (!token) return navigate('/login');

          const formData = new FormData();
          formData.append('image', file);

          const response = await axios.post(`http://localhost:5000/api/notes/${id}/images`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });

          setNotes(prevNotes => prevNotes.map(note => (note._id === id ? response.data : note)));
        } catch (err) {
          console.error('Add image error:', err);
          setError(err.response?.data?.error || 'Failed to upload image');
        }
      }
    });

    fileInput.click();
  }

  async function deleteImage(noteId, publicId) {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      setDeletingImages(prev => new Set([...prev, publicId]));

      setNotes(prevNotes => prevNotes.map(note => {
        if (note._id === noteId) {
          return {
            ...note,
            images: note.images.filter(image => image.public_id !== publicId),
          };
        }
        return note;
      }));

      const response = await axios.delete(`http://localhost:5000/api/notes/${noteId}/images/${encodeURIComponent(publicId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(prevNotes => prevNotes.map(note => (note._id === noteId ? response.data : note)));

      setDeletingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(publicId);
        return newSet;
      });
    } catch (err) {
      console.error('Delete image error:', err);
      setError(err.response?.data?.error || 'Failed to delete image');

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const response = await axios.get(`http://localhost:5000/api/notes/${noteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotes(prevNotes => prevNotes.map(note => (note._id === noteId ? response.data : note)));
      } catch (fetchErr) {
        console.error('Fetch single note error:', fetchErr);
        setError('Failed to refresh note after image deletion');
      }

      setDeletingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(publicId);
        return newSet;
      });
    } finally {
      isDeletingRef.current = false;
    }
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentNote = notes.find(note => note._id === activeNote);

  function getRandomColor() {
    const colors = ['#FFD4DE', '#FFECB8', '#E2F9B8', '#A1E5EE', '#D4BBFF', '#FFD4B8', '#CCFFD9'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  return (
    <div className={styles.app}>
      {error && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={16} style={{ marginRight: '8px' }} />
          {error}
        </div>
      )}

      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.appTitle}>NoteBloom</h1>
          <div className={styles.buttonGroup}>
            <button className={styles.addButton} onClick={addNote}>
              <PlusCircle size={20} />
              <span>New Note</span>
            </button>
            <button className={styles.logoutButton} onClick={handleLogout}>
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search notes..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.notesList}>
          {filteredNotes.length === 0 ? (
            <div className={styles.emptyState}>
              {notes.length === 0 ? "No notes yet. Create one!" : "No matching notes."}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note._id}
                className={`${styles.noteItem} ${activeNote === note._id ? styles.active : ''}`}
                style={{ backgroundColor: note.color }}
                onClick={() => setActiveNote(note._id)}
              >
                <div className={styles.noteItemContent}>
                  <h3 className={styles.noteTitle}>{note.title}</h3>
                  <p className={styles.notePreview}>
                    {note.content.substring(0, 60) + (note.content.length > 60 ? '...' : '')}
                  </p>
                  <div className={styles.noteFooter}>
                    <span className={styles.noteDate}>
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {note.images.length > 0 && (
                      <span className={styles.imageCount}>
                        <Image size={12} /> {note.images.length}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note._id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.editor}>
        {activeNote === null ? (
          <div className={styles.noNoteSelected}>
            <div className={styles.welcomeMessage}>
              <h2>Welcome to NoteBloom!</h2>
              <p>Select a note or create a new one to get started.</p>
              <button className={styles.addButton} onClick={addNote}>
                <PlusCircle size={20} />
                <span>New Note</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noteEditor}>
            <input
              type="text"
              className={styles.titleInput}
              value={tempNoteData.title || ''}
              onChange={(e) => setTempNoteData({ ...tempNoteData, title: e.target.value })}
              placeholder="Note Title"
            />

            <div className={styles.editorActions}>
              <button className={styles.imageButton} onClick={() => addImage(activeNote)}>
                <Image size={20} />
                <span>Add Image</span>
              </button>
            </div>

            <textarea
              className={styles.contentInput}
              value={tempNoteData.content || ''}
              onChange={(e) => setTempNoteData({ ...tempNoteData, content: e.target.value })}
              placeholder="Start typing your note..."
            />

            {currentNote?.images?.length > 0 && (
              <div className={styles.imagesContainer}>
                {currentNote.images.map((image, index) => (
                  <div key={image.public_id} className={styles.imageWrapper}>
                    <img
                      src={image.url}
                      alt={`Note attachment ${index + 1}`}
                      className={styles.noteImage}
                      style={{ opacity: deletingImages.has(image.public_id) ? 0.5 : 1, cursor: 'pointer' }}
                      onClick={() => handleImageClick(image)}
                    />
                    <button
                      className={styles.removeImageButton}
                      onClick={() => deleteImage(activeNote, image.public_id)}
                      disabled={deletingImages.has(image.public_id) || isDeletingRef.current}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className={styles.imageModal} onClick={handleCloseModal}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalButton} onClick={handleCloseModal}>
              <X size={24} />
            </button>
            <img
              src={selectedImage.url}
              alt="Enlarged note attachment"
              className={styles.enlargedImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Notespage;