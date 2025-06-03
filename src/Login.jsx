import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  Check, 
  AlertTriangle,
  Github,
  Twitter,
  Facebook,
  BookOpen,
  Calendar,
  CloudLightning
} from 'lucide-react';
import axios from 'axios';
import styles from './auth.module.css';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isLogin 
        ? 'https://notesapp-backend-ljac.onrender.com/api/auth/login' 
        : 'https://notesapp-backend-ljac.onrender.com/api/auth/signup';
      
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password };

      const response = await axios.post(url, payload);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setIsLoading(false);
      setFormSuccess(true);

      setTimeout(() => {
        setFormSuccess(false);
        setFormData({ name: '', email: '', password: '' });
        navigate('/notes');
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.leftPanel}>
        <div className={styles.decorativeShape1}></div>
        <div className={styles.decorativeShape2}></div>
        
        <div className={styles.leftPanelContent}>
          <div className={styles.brandLogo}>
            <CloudLightning size={80} color="white" strokeWidth={1.5} />
          </div>
          
          <h1 className={styles.brandName}>NoteBloom</h1>
          <p className={styles.brandTagline}>
            Capture your thoughts, organize your life, and unleash your creativity
          </p>
          
          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <BookOpen className={styles.featureIcon} size={24} />
              <span>Create beautiful notes with rich formatting</span>
            </div>
            <div className={styles.featureItem}>
              <Calendar className={styles.featureIcon} size={24} />
              <span>Organize and schedule your tasks efficiently</span>
            </div>
            <div className={styles.featureItem}>
              <CloudLightning className={styles.featureIcon} size={24} />
              <span>Access your notes from anywhere, anytime</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.rightPanel}>
        <div className={`${styles.formContainer} ${isLogin ? styles.login : styles.signup}`}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>
              {isLogin ? 'Welcome back!' : 'Create an account'}
            </h2>
            <p className={styles.formSubtitle}>
              {isLogin 
                ? 'Sign in to continue to NoteBloom' 
                : 'Join NoteBloom and start organizing your ideas'}
            </p>
          </div>
          
          {error && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={16} style={{ marginRight: '8px' }} />
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className={styles.inputGroup}>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="Full Name" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required 
                />
                <User className={styles.inputIcon} size={18} />
              </div>
            )}
            
            <div className={styles.inputGroup}>
              <input 
                type="email" 
                className={styles.input} 
                placeholder="Email Address" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required 
              />
              <Mail className={styles.inputIcon} size={18} />
            </div>
            
            <div className={styles.inputGroup}>
              <input 
                type="password" 
                className={styles.input} 
                placeholder="Password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required 
              />
              <Lock className={styles.inputIcon} size={18} />
            </div>
            
            {isLogin && (
              <a href="#" className={styles.forgotPassword}>
                Forgot password?
              </a>
            )}
            
            <button 
              type="submit" 
              className={`${styles.submitButton} ${formSuccess ? styles.successAnimation : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                'Loading...'
              ) : formSuccess ? (
                <>
                  <Check size={18} style={{ marginRight: '8px' }} />
                  {isLogin ? 'Signed In' : 'Account Created'}
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn size={18} style={{ marginRight: '8px' }} />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} style={{ marginRight: '8px' }} />
                      Sign Up
                    </>
                  )}
                </>
              )}
            </button>
          </form>
          
          <div className={styles.divider}></div>
          
          <div className={styles.socialLogin}>
            <button className={styles.socialButton}>
              <Github size={20} />
            </button>
            <button className={styles.socialButton}>
              <Twitter size={20} />
            </button>
            <button className={styles.socialButton}>
              <Facebook size={20} />
            </button>
          </div>
          
          <div className={styles.switchMode}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <a href="#" className={styles.switchModeLink} onClick={toggleAuthMode}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;