import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useSignUpMutation,
  useVerifySignupMutation,
  useResendSignupCodeMutation,
} from '@/redux/api/authApi';
import { useAppDispatch } from '@/redux/hooks';
import { setGuestUser, setPendingEmail } from '@/redux/slices/authSlice';

export default function SignUpScreen() {
  const dispatch = useAppDispatch();
  const [signUpApi, { isLoading: isSigningUp }] = useSignUpMutation();
  const [verifySignupApi, { isLoading: isVerifying }] = useVerifySignupMutation();
  const [resendCodeApi, { isLoading: isResending }] = useResendSignupCodeMutation();

  const [step, setStep] = useState<'form' | 'verify'>('form');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Verification Code State
  const [verifyCode, setVerifyCode] = useState('');
  const [receivedCode, setReceivedCode] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Success Modal State (shown after email code verification)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // UI state
  const loading = isSigningUp || isVerifying;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codeInputRef = useRef<any>(null);

  // Focus code input on entering verify step
  useEffect(() => {
    if (step === 'verify') {
      const timer = setTimeout(() => {
        codeInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Countdown timer for resend code
  useEffect(() => {
    let interval: any = null;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: '', color: '#CBD5E1', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: '#EF4444', width: '33%' };
    const hasNumbers = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    if (password.length >= 8 && hasNumbers && hasUpper) {
      return { label: 'Strong', color: '#10B981', width: '100%' };
    }
    return { label: 'Good', color: '#F59E0B', width: '66%' };
  };

  const strength = getPasswordStrength();

  // Handle Initial Registration via Redux RTK Query
  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await signUpApi({
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: phone.trim() || undefined,
      }).unwrap();

      // ALWAYS transition to 6-digit code verification step!
      dispatch(setPendingEmail(cleanEmail));
      setReceivedCode(result?.code || null);
      setVerifyCode(''); // Clean field ready for user entry
      setResendCountdown(60); // 60s cooldown
      setStep('verify');
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.error ||
        'Failed to create account. Please ensure the backend is running and try again.';
      setErrorMessage(msg);
    }
  };

  // Handle 6-Digit Email Code Verification via Redux RTK Query -> Show Success Modal!
  const handleVerifySignup = async (overrideCode?: string) => {
    setErrorMessage(null);

    const cleanCode = (overrideCode || verifyCode).trim();
    if (!cleanCode || cleanCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await verifySignupApi({
        email: cleanEmail,
        code: cleanCode,
      }).unwrap();

      setSuccessModalMessage(
        result.message || 'Your MediRem account has been verified successfully!'
      );
      setShowSuccessModal(true);
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.error ||
        'Invalid or expired verification code. Please check your Gmail.';
      setErrorMessage(msg);
    }
  };

  // Resend 6-Digit Verification Code via Redux RTK Query
  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setErrorMessage(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await resendCodeApi({ email: cleanEmail }).unwrap();
      setResendCountdown(60);
      Alert.alert('Code Sent! ✉️', result.message || `A fresh 6-digit verification code was sent to ${cleanEmail}. Check your Gmail inbox.`);
    } catch (err: any) {
      const msg = err?.data?.message || err?.error || 'Failed to resend code.';
      setErrorMessage(msg);
    }
  };

  const handleGuestLogin = () => {
    dispatch(setGuestUser());
    router.replace('/(tabs)/today');
  };

  const digits = verifyCode.split('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Top Bar with Back & Guest Action */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                if (step === 'verify') setStep('form');
                else router.back();
              }}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>

            {step === 'form' ? (
              <TouchableOpacity
                onPress={handleGuestLogin}
                style={styles.skipButton}
                activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip as Guest</Text>
                <Ionicons name="chevron-forward" size={14} color="#64748B" />
              </TouchableOpacity>
            ) : (
              <View style={styles.verifyStepBadge}>
                <Text style={styles.verifyStepBadgeText}>Step 2 of 2</Text>
              </View>
            )}
          </View>

          {/* STEP 1: REGISTRATION FORM */}
          {step === 'form' && (
            <View>
              {/* Logo & Header Section */}
              <View style={styles.headerSection}>
                <Image
                  source={require('@/../assets/images/icon-symbol.png')}
                  style={styles.brandIcon}
                  resizeMode="contain"
                />
                <Text style={styles.title}>Create Account ✨</Text>
                <Text style={styles.subtitle}>
                  Start tracking your medications, loud alarms, and supply inventory
                </Text>
              </View>

              {/* Error Banner if any */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* Form Fields */}
              <View style={styles.formContainer}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Rahman Ahmed"
                      placeholderTextColor="#94A3B8"
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@example.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Phone Number (Optional) */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelWithBadgeRow}>
                    <Text style={styles.inputLabel}>Phone / Emergency Contact</Text>
                    <Text style={styles.optionalBadge}>Optional</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="+1 (555) 000-0000"
                      placeholderTextColor="#94A3B8"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.eyeIcon}
                      accessibilityLabel="Toggle password visibility">
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthTrack}>
                        <View
                          style={[
                            styles.strengthFill,
                            {
                              width: strength.width as any,
                              backgroundColor: strength.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.strengthText, { color: strength.color }]}>
                        {strength.label}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Confirm Password Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Re-enter password"
                      placeholderTextColor="#94A3B8"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    {confirmPassword.length > 0 && (
                      <Ionicons
                        name={
                          password === confirmPassword && confirmPassword.length >= 6
                            ? 'checkmark-circle'
                            : 'close-circle'
                        }
                        size={20}
                        color={
                          password === confirmPassword && confirmPassword.length >= 6
                            ? '#10B981'
                            : '#EF4444'
                        }
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                </View>

                {/* Terms and Conditions Checkbox */}
                <TouchableOpacity
                  onPress={() => setAgreeTerms((prev) => !prev)}
                  style={styles.termsRow}
                  activeOpacity={0.8}>
                  <View
                    style={[
                      styles.checkbox,
                      agreeTerms && styles.checkboxActive,
                    ]}>
                    {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>

                {/* Submit Sign Up Button */}
                <TouchableOpacity
                  onPress={handleSignUp}
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Create Account & Send Code</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Direct shortcut to verification screen if user already received code */}
                <TouchableOpacity
                  onPress={() => {
                    if (!email.trim() || !email.includes('@')) {
                      setErrorMessage('Please enter your email above first, then click here to enter your code.');
                      return;
                    }
                    setErrorMessage(null);
                    setStep('verify');
                  }}
                  style={styles.alreadyHaveCodeButton}
                  activeOpacity={0.7}>
                  <Ionicons name="key-outline" size={15} color="#208AEF" />
                  <Text style={styles.alreadyHaveCodeText}>
                    Already have a verification code? <Text style={styles.alreadyHaveCodeLink}>Enter Code</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer: Sign In Link */}
              <View style={styles.footerSection}>
                <Text style={styles.footerPrompt}>Already have an account?</Text>
                <TouchableOpacity
                  onPress={() => router.push('/sign-in')}
                  activeOpacity={0.7}
                  style={{ marginLeft: 6 }}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: CODE VERIFICATION (AFTER SIGN UP) */}
          {step === 'verify' && (
            <View>
              <View style={styles.headerSection}>
                <View style={styles.badgeCircle}>
                  <Ionicons name="mail-unread-outline" size={36} color="#208AEF" />
                </View>
                <Text style={styles.title}>Verify Your Email ✉️</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit verification code to{' '}
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{email}</Text> via Gmail.
                </Text>
              </View>

              {/* Developer / Live Help Chip */}
              {receivedCode && (
                <View style={styles.infoBanner}>
                  <Ionicons name="key-outline" size={16} color="#0284C7" />
                  <Text style={styles.infoBannerText}>
                    Code sent to your Gmail: <Text style={{ fontWeight: '800' }}>{receivedCode}</Text>
                  </Text>
                </View>
              )}

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.formContainer}>
                {/* 6 Individual Interactive OTP Digit Boxes with full overlay touch input */}
                <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                <View style={styles.otpContainer}>
                  <View style={styles.otpBoxesRow} pointerEvents="none">
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                      const digit = digits[idx] || '';
                      const isCurrent = verifyCode.length === idx;
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.otpBox,
                            isCurrent && styles.otpBoxActive,
                            digit ? styles.otpBoxFilled : null,
                          ]}>
                          <Text style={styles.otpDigit}>{digit || (isCurrent ? '|' : '•')}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Native full-width overlay input */}
                  <TextInput
                    ref={codeInputRef}
                    style={styles.fullOverlayInput}
                    value={verifyCode}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                      setVerifyCode(cleaned);
                      if (errorMessage) setErrorMessage(null);
                      if (cleaned.length === 6) {
                        handleVerifySignup(cleaned);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    caretHidden
                  />
                </View>

                {/* Verify Code Button */}
                <TouchableOpacity
                  onPress={() => handleVerifySignup()}
                  style={[styles.primaryButton, (loading || verifyCode.length < 6) && styles.buttonDisabled]}
                  disabled={loading || verifyCode.length < 6}
                  activeOpacity={0.85}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Verify & Proceed to Login</Text>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Resend Code Button with countdown */}
                <TouchableOpacity
                  onPress={handleResendCode}
                  style={styles.resendButton}
                  disabled={isResending || resendCountdown > 0}
                  activeOpacity={0.7}>
                  {isResending ? (
                    <ActivityIndicator size="small" color="#208AEF" />
                  ) : (
                    <Text style={styles.resendText}>
                      {"Didn't receive email? "}
                      <Text style={[styles.resendLink, resendCountdown > 0 && { color: '#94A3B8' }]}>
                        {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Code'}
                      </Text>
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Change Email */}
                <TouchableOpacity
                  onPress={() => setStep('form')}
                  style={{ alignItems: 'center', paddingVertical: 10 }}
                  activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>
                    Wrong email? <Text style={{ color: '#208AEF', fontWeight: '700' }}>Change email address</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SUCCESS MODAL AFTER CODE VERIFICATION */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace({ pathname: '/sign-in', params: { email: email.trim().toLowerCase() } });
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRing}>
              <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            </View>

            <Text style={styles.modalTitle}>Account Verified! 🎉</Text>

            <Text style={styles.modalBody}>
              {successModalMessage || 'Your account has been verified successfully!'}
              {'\n\n'}
              Welcome to MediRem, <Text style={styles.modalBoldText}>{name.trim() || 'User'}</Text>! Your email is verified and your account is active.
            </Text>

            <View style={styles.modalUserCard}>
              <Ionicons name="mail-outline" size={18} color="#0284C7" />
              <Text style={styles.modalUserCardEmail} numberOfLines={1}>
                {email.trim().toLowerCase()}
              </Text>
              <View style={styles.modalVerifiedBadge}>
                <Ionicons name="checkmark-done" size={12} color="#10B981" />
                <Text style={styles.modalVerifiedBadgeText}>Verified</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace({ pathname: '/sign-in', params: { email: email.trim().toLowerCase() } });
              }}
              activeOpacity={0.85}>
              <Text style={styles.modalActionButtonText}>Proceed to Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  verifyStepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifyStepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#208AEF',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandIcon: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 14,
  },
  badgeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#0369A1',
    flex: 1,
  },
  formContainer: {
    gap: 15,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 2,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionalBadge: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginVertical: 10,
  },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#208AEF',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  otpBoxFilled: {
    borderColor: '#208AEF',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpContainer: {
    position: 'relative',
    marginVertical: 10,
    height: 60,
    justifyContent: 'center',
  },
  fullOverlayInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 60,
    opacity: 0,
  },
  alreadyHaveCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  alreadyHaveCodeText: {
    fontSize: 13,
    color: '#64748B',
  },
  alreadyHaveCodeLink: {
    color: '#208AEF',
    fontWeight: '700',
  },
  eyeIcon: {
    padding: 6,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  termsText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: '#208AEF',
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#208AEF',
    height: 52,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resendText: {
    fontSize: 13,
    color: '#64748B',
  },
  resendLink: {
    color: '#208AEF',
    fontWeight: '700',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerPrompt: {
    fontSize: 14,
    color: '#64748B',
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#208AEF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  modalIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#D1FAE5',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalBody: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  modalBoldText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  modalUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    marginBottom: 22,
  },
  modalUserCardEmail: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
  },
  modalVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modalVerifiedBadgeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '700',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#208AEF',
    width: '100%',
    height: 52,
    borderRadius: 14,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
