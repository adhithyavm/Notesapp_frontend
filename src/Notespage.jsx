import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './App.module.css';
import { PlusCircle, Trash2, Image, Search, AlertTriangle, LogOut, X } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Notespage() {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  
  // Separate local editing state from server state
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [deletingImages, setDeletingImages] = useState(new Set());
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Refs for performance optimization
  const saveTimeoutRef = useRef(null);
  const isDeletingRef = useRef(false);
  const isUpdatingFromServer = useRef(false);
  const lastSavedState = useRef({ title: '', content: '' });
  
  const navigate = useNavigate();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    navigate('/');
  }, [navigate]);

  const handleImageClick = useCallback((image) => {
    setSelectedImage(image);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Optimized search with useMemo
  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return notes;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return notes.filter(note =>
      note.title.toLowerCase().includes(lowerSearchTerm) ||
      note.content.toLowerCase().includes(lowerSearchTerm)
    );
  }, [notes, searchTerm]);

  // Get current note with memoization
  const currentNote = useMemo(() => 
    notes.find(note => note._id === activeNote), 
    [notes, activeNote]
  );

  // Handle Escape key for modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && selectedImage) {
        handleCloseModal();
      }
    };
    
    if (selectedImage) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedImage, handleCloseModal]);

  // Initial data fetch
  useEffect(() => {
    fetchNotes();
  }, []);

  // Only sync local state when switching notes or on initial load
  useEffect(() => {
    if (activeNote && currentNote && !isUpdatingFromServer.current) {
      const newTitle = currentNote.title || '';
      const newContent = currentNote.content || '';
      
      // Only update if we're switching to a different note or initial load
      if (lastSavedState.current.title !== newTitle || lastSavedState.current.content !== newContent) {
        setLocalTitle(newTitle);
        setLocalContent(newContent);
        setHasUnsavedChanges(false);
        lastSavedState.current = { title: newTitle, content: newContent };
      }
    } else if (!activeNote) {
      setLocalTitle('');
      setLocalContent('');
      setHasUnsavedChanges(false);
      lastSavedState.current = { title: '', content: '' };
    }
  }, [activeNote]); // Remove currentNote from dependencies to prevent loops

  // Detect changes and manage auto-save
  useEffect(() => {
    if (!activeNote || !currentNote) return;

    // Check if there are actual changes from the last saved state
    const titleChanged = localTitle !== lastSavedState.current.title;
    const contentChanged = localContent !== lastSavedState.current.content;
    
    if (!titleChanged && !contentChanged) {
      setHasUnsavedChanges(false);
      return;
    }

    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set debounced save
    saveTimeoutRef.current = setTimeout(() => {
      if (!isDeletingRef.current && (titleChanged || contentChanged)) {
        performSave();
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localTitle, localContent, activeNote]);

  // Perform save operation
  const performSave = useCallback(async () => {
    if (!activeNote) return;

    try {
      isUpdatingFromServer.current = true;
      await updateNote(activeNote, {
        title: localTitle,
        content: localContent,
      });
      
      // Update last saved state
      lastSavedState.current = { title: localTitle, content: localContent };
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      isUpdatingFromServer.current = false;
    }
  }, [activeNote, localTitle, localContent]);

  // Save on component unmount or note change
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && activeNote && saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Immediate save on unmount (fire and forget)
        updateNote(activeNote, {
          title: localTitle,
          content: localContent,
        }).catch(console.error);
      }
    };
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/');

      const response = await axios.get('https://notesapp-backend-ljac.onrender.com/api/notes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(response.data);
    } catch (err) {
      console.error('Fetch notes error:', err);
      setError(err.response?.data?.error || 'Failed to fetch notes');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  }, [navigate]);

  const addNote = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/');

      const newNote = {
        title: 'Untitled Note',
        content: '',
        color: getRandomColor(),
      };

      const response = await axios.post('https://notesapp-backend-ljac.onrender.com/api/notes', newNote, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(prev => [...prev, response.data]);
      setActiveNote(response.data._id);
    } catch (err) {
      console.error('Add note error:', err);
      setError(err.response?.data?.error || 'Failed to create note');
    }
  }, [navigate]);

  const deleteNote = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/');

      await axios.delete(`https://notesapp-backend-ljac.onrender.com/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(prev => prev.filter(note => note._id !== id));
      if (activeNote === id) {
        setActiveNote(null);
        setLocalTitle('');
        setLocalContent('');
        setHasUnsavedChanges(false);
        lastSavedState.current = { title: '', content: '' };
      }
    } catch (err) {
      console.error('Delete note error:', err);
      setError(err.response?.data?.error || 'Failed to delete note');
    }
  }, [navigate, activeNote]);

  const updateNote = useCallback(async (id, updates) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/');

      const response = await axios.put(`https://notesapp-backend-ljac.onrender.com/api/notes/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update notes state without triggering local state changes
      setNotes(prevNotes => prevNotes.map(note => {
        if (note._id === id) {
          return response.data;
        }
        return note;
      }));

      return response.data;
    } catch (err) {
      console.error('Update note error:', err);
      setError(err.response?.data?.error || 'Failed to update note');
      throw err;
    }
  }, [navigate]);

  const addImage = useCallback(async (id) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const token = localStorage.getItem('token');
          if (!token) return navigate('/');

          const formData = new FormData();
          formData.append('image', file);

          const response = await axios.post(`https://notesapp-backend-ljac.onrender.com/api/notes/${id}/images`, formData, {
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
  }, [navigate]);

  const deleteImage = useCallback(async (noteId, publicId) => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      setDeletingImages(prev => new Set([...prev, publicId]));

      // Optimistic update
      setNotes(prevNotes => prevNotes.map(note => {
        if (note._id === noteId) {
          return {
            ...note,
            images: note.images.filter(image => image.public_id !== publicId),
          };
        }
        return note;
      }));

      const response = await axios.delete(`https://notesapp-backend-ljac.onrender.com/api/notes/${noteId}/images/${encodeURIComponent(publicId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(prevNotes => prevNotes.map(note => (note._id === noteId ? response.data : note)));
    } catch (err) {
      console.error('Delete image error:', err);
      setError(err.response?.data?.error || 'Failed to delete image');

      // Revert optimistic update on error
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }
        const response = await axios.get(`https://notesapp-backend-ljac.onrender.com/api/notes/${noteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotes(prevNotes => prevNotes.map(note => (note._id === noteId ? response.data : note)));
      } catch (fetchErr) {
        console.error('Fetch single note error:', fetchErr);
        setError('Failed to refresh note after image deletion');
      }
    } finally {
      setDeletingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(publicId);
        return newSet;
      });
      isDeletingRef.current = false;
    }
  }, [navigate]);

  // Optimized input handlers - these should NOT cause re-renders or state conflicts
  const handleTitleChange = useCallback((e) => {
    setLocalTitle(e.target.value);
  }, []);

  const handleContentChange = useCallback((e) => {
    setLocalContent(e.target.value);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleNoteSelect = useCallback(async (noteId) => {
    // Save current note before switching if there are unsaved changes
    if (hasUnsavedChanges && activeNote && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      try {
        await performSave();
      } catch (error) {
        console.error('Failed to save before switching notes:', error);
      }
    }
    setActiveNote(noteId);
  }, [hasUnsavedChanges, activeNote, performSave]);

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
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.notesList}>
          {filteredNotes.length === 0 ? (
            <div className={styles.emptyState}>
              {notes.length === 0 ? "No notes yet. Create one!" : "No matching notes."}
            </div>
          ) : (
            filteredNotes.map(note => (
              <NoteItem
                key={note._id}
                note={note}
                isActive={activeNote === note._id}
                onSelect={handleNoteSelect}
                onDelete={deleteNote}
                hasUnsavedChanges={hasUnsavedChanges && activeNote === note._id}
              />
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
            <div className={styles.editorHeader}>
              <input
                type="text"
                className={styles.titleInput}
                value={localTitle}
                onChange={handleTitleChange}
                placeholder="Note Title"
              />
              {hasUnsavedChanges && (
                <span className={styles.unsavedIndicator}>●</span>
              )}
            </div>

            <div className={styles.editorActions}>
              <button className={styles.imageButton} onClick={() => addImage(activeNote)}>
                <Image size={20} />
                <span>Add Image</span>
              </button>
            </div>

            <textarea
              className={styles.contentInput}
              value={localContent}
              onChange={handleContentChange}
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
                      style={{ 
                        opacity: deletingImages.has(image.public_id) ? 0.5 : 1, 
                        cursor: 'pointer' 
                      }}
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

// Memoized NoteItem component to prevent unnecessary re-renders
const NoteItem = React.memo(({ note, isActive, onSelect, onDelete, hasUnsavedChanges }) => (
  <div
    className={`${styles.noteItem} ${isActive ? styles.active : ''}`}
    style={{ backgroundColor: note.color }}
    onClick={() => onSelect(note._id)}
  >
    <div className={styles.noteItemContent}>
      <h3 className={styles.noteTitle}>
        {note.title}
        {hasUnsavedChanges && <span className={styles.unsavedDot}>●</span>}
      </h3>
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
        onDelete(note._id);
      }}
    >
      <Trash2 size={16} />
    </button>
  </div>
));

export default Notespage;