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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  signUp,
  verifySignup,
  resendSignupCode,
  continueAsGuest,
} from '@/services/auth-service';

export default function SignUpScreen() {
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
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
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

  // Handle Initial Registration
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

    setLoading(true);
    const result = await signUp(name, email, password, phone);
    setLoading(false);

    if (result.success) {
      if (result.requiresVerification) {
        setReceivedCode(result.code || null);
        setVerifyCode(''); // Clean field ready for user entry
        setResendCountdown(60); // 60s cooldown
        setStep('verify');
      } else {
        Alert.alert(
          'Account Created! 🎉',
          `Welcome to MediRem, ${result.user?.name || name}!\n\nPlease sign in with your credentials.`,
          [
            {
              text: 'Go to Sign In',
              onPress: () => router.replace({ pathname: '/sign-in', params: { email } }),
            },
          ]
        );
      }
    } else {
      setErrorMessage(result.error || 'Failed to create account. Please try again.');
    }
  };

  // Handle 6-Digit Email Code Verification -> Redirect to Login Page!
  const handleVerifySignup = async (overrideCode?: string) => {
    setErrorMessage(null);

    const cleanCode = (overrideCode || verifyCode).trim();
    if (!cleanCode || cleanCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    const result = await verifySignup(email, cleanCode);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Account Verified! 🎉',
        'Your MediRem account has been verified successfully!\n\nYou will now be redirected to the Sign In page.',
        [
          {
            text: 'Sign In Now',
            onPress: () => router.replace({ pathname: '/sign-in', params: { email } }),
          },
        ]
      );
    } else {
      setErrorMessage(result.error || 'Invalid or expired verification code.');
    }
  };

  // Resend 6-Digit Verification Code
  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setErrorMessage(null);
    setResending(true);
    const result = await resendSignupCode(email);
    setResending(false);

    if (result.success) {
      setReceivedCode(result.code || null);
      setResendCountdown(60);
      Alert.alert('Code Sent! ✉️', `A fresh 6-digit verification code was sent to ${email}. Check your Gmail inbox.`);
    } else {
      setErrorMessage(result.error || 'Failed to resend code.');
    }
  };

  const handleGuestLogin = () => {
    continueAsGuest();
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
                      <Text style={styles.primaryButtonText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
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

              {/* Optional Developer Help Chip (shown in development only) */}
              {receivedCode && (
                <View style={styles.infoBanner}>
                  <Ionicons name="key-outline" size={16} color="#0284C7" />
                  <Text style={styles.infoBannerText}>
                    Email Sent! Code: <Text style={{ fontWeight: '800' }}>{receivedCode}</Text>
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
                {/* 6 Individual Interactive OTP Digit Boxes */}
                <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => codeInputRef.current?.focus()}
                  style={styles.otpBoxesRow}>
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
                </TouchableOpacity>

                {/* Hidden Native Input */}
                <TextInput
                  ref={codeInputRef}
                  style={styles.hiddenInput}
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
                  caretHidden
                />

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
                  disabled={resending || resendCountdown > 0}
                  activeOpacity={0.7}>
                  {resending ? (
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
  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: 1,
    height: 1,
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
});
