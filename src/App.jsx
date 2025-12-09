import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function EmployerApp() {
  const [view, setView] = useState('home');
  const [presentEmployees, setPresentEmployees] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    if (view === 'attendance') {
      loadTodayAttendance();
    }
    return () => {
      stopCamera();
    };
  }, [view]);

  const loadTodayAttendance = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('employee_id')
        .eq('date', today)
        .eq('status', 'present');

      if (attendanceError) throw attendanceError;

      if (attendanceData && attendanceData.length > 0) {
        const employeeIds = attendanceData.map(a => a.employee_id);
        
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', employeeIds);

        if (employeesError) throw employeesError;
        setPresentEmployees(employeesData || []);
      } else {
        setPresentEmployees([]);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
      showMessage('Error loading attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      // CRITICAL: Wait for video to actually load
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play()
          .then(() => {
            setScanning(true);
            // Start scanning with a slight delay to ensure frame is ready
            setTimeout(() => {
              scanIntervalRef.current = setInterval(scanQR, 300);
            }, 500);
          })
          .catch(err => console.error('Play error:', err));
      };
    }
  } catch (err) {
    console.error('Camera error:', err);
    showMessage('Camera access denied', 'error');
  }
};


  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

const scanQR = () => {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  
  console.log('Scanning...', { video, canvas, scanning });
  
  if (!video || !canvas) {
    console.log('Missing refs');
    return;
  }

  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  console.log('Canvas dimensions:', canvas.width, canvas.height);

  if (canvas.width === 0 || canvas.height === 0) {
    console.log('Video not ready yet');
    return;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  console.log('QR Result:', code);

  if (code && code.data) {
    console.log('QR DETECTED:', code.data);
    handleQRDetected(code.data);
  }
};

  const handleQRDetected = async (employeeId) => {
    stopCamera();
    setScanning(false);
    
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        showMessage('Invalid QR', 'error');
        setTimeout(() => {
          setMessage({ text: '', type: '' });
          setView('home');
        }, 2000);
        return;
      }

      const { data: existing, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existing) {
        showMessage('Already marked present today', 'warning');
        setTimeout(() => {
          setMessage({ text: '', type: '' });
          setView('home');
        }, 2000);
        return;
      }

      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          date: today,
          status: 'present'
        });

      if (insertError) throw insertError;

      showMessage('Attendance marked successfully', 'success');
      setTimeout(() => {
        setMessage({ text: '', type: '' });
        setView('home');
      }, 2000);
    } catch (err) {
      console.error('Error marking attendance:', err);
      showMessage('Error marking attendance', 'error');
      setTimeout(() => {
        setMessage({ text: '', type: '' });
        setView('home');
      }, 2000);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      padding: '32px',
      width: '100%',
      maxWidth: '448px'
    },
    title: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#7C3AED',
      marginBottom: '8px',
      textAlign: 'center'
    },
    subtitle: {
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: '32px'
    },
    button: {
      width: '100%',
      backgroundColor: '#7C3AED',
      color: 'white',
      fontWeight: '600',
      padding: '16px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '16px',
      transition: 'background-color 0.2s'
    },
    buttonSecondary: {
      backgroundColor: '#2563EB'
    },
    dashContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
      padding: '16px'
    },
    dashContent: {
      maxWidth: '768px',
      margin: '0 auto'
    },
    header: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      marginBottom: '24px'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px'
    },
    backIcon: {
      padding: '8px',
      backgroundColor: '#F3F4F6',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    },
    headerTitle: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#7C3AED'
    },
    headerSubtitle: {
      fontSize: '14px',
      color: '#6B7280',
      marginTop: '4px'
    },
    message: {
      padding: '16px',
      borderRadius: '12px',
      textAlign: 'center',
      fontWeight: '600',
      marginBottom: '16px'
    },
    messageSuccess: {
      backgroundColor: '#D1FAE5',
      color: '#065F46'
    },
    messageError: {
      backgroundColor: '#FEE2E2',
      color: '#991B1B'
    },
    messageWarning: {
      backgroundColor: '#FEF3C7',
      color: '#92400E'
    },
    videoContainer: {
      backgroundColor: '#000000',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
      maxWidth: '640px',
      margin: '0 auto'
    },
    video: {
      width: '100%',
      height: 'auto',
      display: 'block'
    },
    canvas: {
        display: 'none',
        border: '1px solid red',
        width: '100%',
        marginTop: '16px'      
    },
    scanNote: {
      textAlign: 'center',
      color: '#6B7280',
      marginTop: '16px',
      fontSize: '14px'
    },
    attendanceCard: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      padding: '24px'
    },
    attendanceTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: '16px'
    },
    noData: {
      textAlign: 'center',
      padding: '48px',
      color: '#9CA3AF'
    },
    countBadge: {
      padding: '12px',
      backgroundColor: '#D1FAE5',
      borderRadius: '12px',
      marginBottom: '16px'
    },
    countText: {
      textAlign: 'center',
      color: '#065F46',
      fontWeight: '600'
    },
    employeeItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '12px',
      marginBottom: '12px',
      transition: 'background-color 0.2s'
    },
    employeeInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    employeeNumber: {
      width: '32px',
      height: '32px',
      backgroundColor: '#7C3AED',
      color: 'white',
      borderRadius: '9999px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontSize: '14px'
    },
    employeeName: {
      color: '#1F2937',
      fontWeight: '500'
    },
    statusBadge: {
      padding: '6px 12px',
      backgroundColor: '#D1FAE5',
      color: '#065F46',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '700'
    }
  };

  if (view === 'home') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Attendance App</h1>
          <p style={styles.subtitle}>Employer Portal</p>

          <button
            style={styles.button}
            onClick={() => {
              setView('scanner');
              setTimeout(startCamera, 100);
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#6D28D9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#7C3AED'}
          >
            <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            QR Scanner
          </button>

          <button
            style={{...styles.button, ...styles.buttonSecondary}}
            onClick={() => setView('attendance')}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1D4ED8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563EB'}
          >
            <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Attendance History
          </button>
        </div>
      </div>
    );
  }

  if (view === 'scanner') {
    return (
      <div style={styles.dashContainer}>
        <div style={styles.dashContent}>
          <div style={styles.header}>
            <div style={styles.backButton}>
              <button
                style={styles.backIcon}
                onClick={() => {
                  stopCamera();
                  setView('home');
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              >
                <svg style={{ width: '24px', height: '24px', color: '#4B5563' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 style={styles.headerTitle}>QR Scanner</h1>
            </div>

            {message.text && (
              <div style={{
                ...styles.message,
                ...(message.type === 'success' ? styles.messageSuccess :
                    message.type === 'error' ? styles.messageError :
                    styles.messageWarning)
              }}>
                {message.text}
              </div>
            )}

            {!message.text && (
              <>
                <div style={styles.videoContainer}>
                  <video ref={videoRef} style={styles.video} playsInline />
                  <canvas ref={canvasRef} style={styles.canvas} />
                </div>
                <p style={styles.scanNote}>
                  Position the QR code within the frame to scan
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'attendance') {
    return (
      <div style={styles.dashContainer}>
        <div style={styles.dashContent}>
          <div style={styles.attendanceCard}>
            <div style={styles.backButton}>
              <button
                style={styles.backIcon}
                onClick={() => setView('home')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              >
                <svg style={{ width: '24px', height: '24px', color: '#4B5563' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 style={styles.attendanceTitle}>Today's Attendance</h1>
                <p style={styles.headerSubtitle}>{formatDate()}</p>
              </div>
            </div>

            {loading ? (
              <div style={styles.noData}>
                <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading...</p>
              </div>
            ) : presentEmployees.length === 0 ? (
              <div style={styles.noData}>
                <p style={{ fontSize: '16px', fontWeight: '500' }}>No employees marked present today</p>
              </div>
            ) : (
              <>
                <div style={styles.countBadge}>
                  <p style={styles.countText}>
                    {presentEmployees.length} employee{presentEmployees.length !== 1 ? 's' : ''} present
                  </p>
                </div>
                {presentEmployees.map((employee, index) => (
                  <div
                    key={employee.id}
                    style={styles.employeeItem}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                  >
                    <div style={styles.employeeInfo}>
                      <div style={styles.employeeNumber}>{index + 1}</div>
                      <span style={styles.employeeName}>{employee.name}</span>
                    </div>
                    <span style={styles.statusBadge}>PRESENT</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}