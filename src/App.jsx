import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';

// --- CONFIGURATION ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- COMPONENT: HEADER WITH NAVIGATION ---
const Header = ({ onLogout, googleSheetUrl = null }) => {
  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 30px',
      background: 'linear-gradient(to right, #1e1b4b, #312e81)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      color: 'white',
    },
    logoutBtn: {
      padding: '10px 20px',
      background: 'linear-gradient(to right, #ef4444, #dc2626)',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.3s ease',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      margin: 0,
    }
  };

  return (
    <header style={styles.header}>
      <button 
        onClick={onLogout}
        style={styles.logoutBtn}
        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      >
        Logout
      </button>
      <h1 style={styles.title}>IWM Attendance App</h1>
      <div style={{ width: '120px' }}></div>
    </header>
  );
};

// --- COMPONENT: SIDEBAR NAVIGATION ---
const Sidebar = ({ activeView, onViewChange, googleSheetUrl }) => {
  const styles = {
    sidebar: {
      width: '250px',
      background: 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)',
      padding: '30px 0',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    navList: {
      listStyle: 'none',
      margin: 0,
      padding: '0 15px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    navItem: {
      margin: 0,
    },
    navButton: {
      width: '100%',
      padding: '14px 16px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: 'white',
      textAlign: 'left',
    },
    navButtonActive: {
      background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
    },
    navButtonInactive: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    navLink: {
      textDecoration: 'none',
      color: 'inherit',
      display: 'block',
    }
  };

  return (
    <aside style={styles.sidebar}>
      <ul style={styles.navList}>
        <li style={styles.navItem}>
          <button
            onClick={() => onViewChange('scanner')}
            style={{
              ...styles.navButton,
              ...(activeView === 'scanner' ? styles.navButtonActive : styles.navButtonInactive),
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateX(4px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateX(0)'}
          >
            📱 QR Scanner
          </button>
        </li>

        <li style={styles.navItem}>
          <button
            onClick={() => onViewChange('history')}
            style={{
              ...styles.navButton,
              ...(activeView === 'history' ? styles.navButtonActive : styles.navButtonInactive),
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateX(4px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateX(0)'}
          >
            📋 Attendance History
          </button>
        </li>

        <li style={styles.navItem}>
          {googleSheetUrl ? (
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...styles.navButton,
                ...styles.navButtonInactive,
                ...styles.navLink,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              📊 Google Sheet
            </a>
          ) : (
            <button
              disabled
              style={{
                ...styles.navButton,
                ...styles.navButtonInactive,
                opacity: 0.5,
                cursor: 'not-allowed',
              }}
            >
              📊 Google Sheet
            </button>
          )}
        </li>
      </ul>
    </aside>
  );
};

// --- COMPONENT: ANIMATED LOGIN SCREEN ---
const LoginScreen = ({ onLogin }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [recoveredCreds, setRecoveredCreds] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('employers')
        .select('*')
        .eq('username', formData.username)
        .eq('password', formData.password)
        .single();

      if (error || !data) throw new Error('Invalid credentials');
      onLogin(data);
    } catch (err) {
      setError('Invalid username or password');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employers')
        .select('username, password')
        .eq('username', formData.username)
        .single();

      if (error || !data) throw new Error('User not found');
      setRecoveredCreds(data);
    } catch (err) {
      setError('Username not found');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    },
    card: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      padding: '40px',
      borderRadius: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      width: '100%',
      maxWidth: '400px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      zIndex: 10,
    },
    title: {
      color: 'white',
      fontSize: '32px',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#94a3b8',
      textAlign: 'center',
      marginBottom: '32px',
      fontSize: '14px'
    },
    inputGroup: {
      position: 'relative',
      marginBottom: '20px'
    },
    input: {
      width: '100%',
      padding: '16px',
      background: 'rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      color: 'white',
      fontSize: '16px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    button: {
      width: '100%',
      padding: '16px',
      background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
      border: 'none',
      borderRadius: '12px',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px'
    },
    link: {
      color: '#818cf8',
      fontSize: '14px',
      textAlign: 'center',
      display: 'block',
      marginTop: '20px',
      cursor: 'pointer'
    },
    error: {
      color: '#f87171',
      textAlign: 'center',
      marginTop: '10px',
      fontSize: '14px'
    },
  };

  if (showForgot) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Recover Access</h2>
          <p style={styles.subtitle}>Enter username to see password</p>
          
          {recoveredCreds ? (
            <div>
              <div style={styles.inputGroup}>
                <label style={{ color: '#94a3b8', fontSize: '12px' }}>Username:</label>
                <input
                  type="text"
                  value={recoveredCreds.username}
                  disabled
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={{ color: '#94a3b8', fontSize: '12px' }}>Password:</label>
                <input
                  type="text"
                  value={recoveredCreds.password}
                  disabled
                  style={styles.input}
                />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button
                onClick={() => setShowForgot(false)}
                style={styles.button}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecover}>
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  style={styles.input}
                />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Searching...' : 'Recover'}
              </button>

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                style={{ ...styles.button, background: 'rgba(255, 255, 255, 0.1)', marginTop: '5px' }}
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Employer Portal</h2>
        <p style={styles.subtitle}>Secure Access</p>

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => setShowForgot(true)}
          style={styles.link}
        >
          Forgot Password?
        </button>
      </div>
    </div>
  );
};

// --- COMPONENT: QR CAMERA SCANNER ---
const QRScanner = ({ employer }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scannedData, setScannedData] = useState(null);
  const [presentEmployees, setPresentEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatDate = () => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
      }
    };

    const scanFrame = () => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        const video = videoRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
          context.drawImage(video, 0, 0);

          const imageData = context.getImageData(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            handleQRScan(code.data);
          }
        }
      }
      requestAnimationFrame(scanFrame);
    };

    startCamera();
    scanFrame();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleQRScan = async (qrData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('qr_code', qrData)
        .eq('employer_id', employer.id)
        .single();

      if (error || !data) {
        setScannedData({ error: 'Employee not found' });
        setTimeout(() => setScannedData(null), 3000);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { error: insertError } = await supabase
        .from('attendance')
        .insert([
          {
            employee_id: data.id,
            employer_id: employer.id,
            date: today,
            timestamp: new Date().toISOString(),
          },
        ]);

      if (!insertError) {
        setScannedData(data);
        setPresentEmployees([...presentEmployees, data]);
        setTimeout(() => setScannedData(null), 2000);
      }
    } catch (err) {
      setScannedData({ error: 'Error processing attendance' });
      setTimeout(() => setScannedData(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '30px',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      overflowY: 'auto',
    },
    scanner: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    header: {
      color: '#1e1b4b',
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
    },
    videoContainer: {
      position: 'relative',
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    },
    video: {
      width: '100%',
      display: 'block',
    },
    overlayText: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      color: 'white',
      fontSize: '14px',
      background: 'rgba(0, 0, 0, 0.5)',
      padding: '10px 15px',
      borderRadius: '8px',
      backdropFilter: 'blur(10px)',
    },
    statusSection: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    statusTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#1e1b4b',
      marginBottom: '15px',
    },
    employeeList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    employeeItem: {
      padding: '12px',
      background: '#f0f4f8',
      borderLeft: '4px solid #6366f1',
      marginBottom: '10px',
      borderRadius: '6px',
      fontSize: '14px',
      color: '#1e1b4b',
    },
    emptyMessage: {
      color: '#718096',
      fontStyle: 'italic',
      fontSize: '14px',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.scanner}>
        <div style={styles.header}>{formatDate()}</div>

        <div style={styles.videoContainer}>
          <video
            ref={videoRef}
            style={styles.video}
            autoPlay
            playsInline
          />
          <div style={styles.overlayText}>
            Position the QR code within the frame to scan
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {scannedData && !scannedData.error && (
          <div style={{
            ...styles.statusSection,
            background: '#d1fae5',
            borderLeft: '4px solid #10b981',
          }}>
            <div style={{ color: '#065f46', fontWeight: 'bold' }}>
              ✓ {scannedData.name} marked present!
            </div>
          </div>
        )}

        {scannedData?.error && (
          <div style={{
            ...styles.statusSection,
            background: '#fee2e2',
            borderLeft: '4px solid #ef4444',
          }}>
            <div style={{ color: '#7f1d1d', fontWeight: 'bold' }}>
              ✗ {scannedData.error}
            </div>
          </div>
        )}

        <div style={styles.statusSection}>
          <div style={styles.statusTitle}>
            {presentEmployees.length === 0
              ? 'No employees marked present today'
              : `${presentEmployees.length} employee${presentEmployees.length !== 1 ? 's' : ''} present`}
          </div>
          {presentEmployees.length > 0 && (
            <ul style={styles.employeeList}>
              {presentEmployees.map((emp, idx) => (
                <li key={idx} style={styles.employeeItem}>
                  {emp.name}
                </li>
              ))}
            </ul>
          )}
          {presentEmployees.length === 0 && (
            <p style={styles.emptyMessage}>Scan QR codes to mark employees present</p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: ATTENDANCE HISTORY ---
const AttendanceHistory = ({ employer }) => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('employee_id, date, timestamp, employees(name)')
          .eq('employer_id', employer.id)
          .order('date', { ascending: false })
          .order('timestamp', { ascending: false });

        if (!error && data) {
          setHistoryData(data);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [employer.id]);

  const styles = {
    container: {
      flex: 1,
      padding: '30px',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      overflowY: 'auto',
    },
    title: {
      color: '#1e1b4b',
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    th: {
      padding: '15px',
      background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
      color: 'white',
      textAlign: 'left',
      fontWeight: 'bold',
    },
    td: {
      padding: '12px 15px',
      borderBottom: '1px solid #e5e7eb',
      color: '#1e1b4b',
    },
    emptyMessage: {
      textAlign: 'center',
      padding: '40px',
      color: '#718096',
      fontSize: '16px',
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Attendance History</div>
        <div style={styles.emptyMessage}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Attendance History</div>
      {historyData.length === 0 ? (
        <div style={styles.emptyMessage}>No attendance records found</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee Name</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {historyData.map((record, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{record.employees?.name || 'Unknown'}</td>
                <td style={styles.td}>{record.date}</td>
                <td style={styles.td}>
                  {new Date(record.timestamp).toLocaleTimeString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [employer, setEmployer] = useState(null);
  const [activeView, setActiveView] = useState('scanner');
  const [googleSheetUrl, setGoogleSheetUrl] = useState(null);

  // You can set the Google Sheet URL here or load it from an environment variable
  // Example: const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const handleLogout = () => {
    setEmployer(null);
    setActiveView('scanner');
  };

  if (!employer) {
    return <LoginScreen onLogin={setEmployer} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <Header onLogout={handleLogout} googleSheetUrl={googleSheetUrl} />
      </div>

      {/* Main Layout with Sidebar */}
      <div style={{ display: 'flex', marginTop: '70px', width: '100%' }}>
        <Sidebar activeView={activeView} onViewChange={setActiveView} googleSheetUrl={googleSheetUrl} />

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {activeView === 'scanner' && <QRScanner employer={employer} />}
          {activeView === 'history' && <AttendanceHistory employer={employer} />}
        </div>
      </div>
    </div>
  );
}