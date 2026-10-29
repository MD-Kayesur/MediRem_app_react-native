import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useForgotPasswordMutation,
  useVerifyResetCodeMutation,
  useResetPasswordMutation,
} from '@/store/api/authApi';

type Step = 'request' | 'verify' | 'new_password' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [forgotPasswordApi, { isLoading: isSendingCode }] = useForgotPasswordMutation();
  const [verifyResetCodeApi, { isLoading: isVerifyingCode }] = useVerifyResetCodeMutation();
  const [resetPasswordApi, { isLoading: isResettingPassword }] = useResetPasswordMutation();

  const [step, setStep] = useState<Step>('request');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isLoading = isSendingCode || isVerifyingCode || isResettingPassword;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [receivedCode, setReceivedCode] = useState<string | null>(null);

  // Step 1: Send 6-digit Code via Nodemailer & Redux
  const handleSendCode = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      const result = await forgotPasswordApi({ email: cleanEmail }).unwrap();
      if ((result as any)?.code) {
        setReceivedCode((result as any).code);
      }
      setInfoMessage(result.message || `Verification code sent to ${cleanEmail}.`);
      setStep('verify');
    } catch (err: any) {
      const msg = err?.data?.message || err?.error || 'Failed to send verification code. Please check email address.';
      setErrorMessage(msg);
    }
  };

  // Step 2: Verify Code via Redux
  const handleVerifyCode = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await verifyResetCodeApi({ email: cleanEmail, code: cleanCode }).unwrap();
      setInfoMessage(result.message || 'Code verified successfully.');
      setStep('new_password');
    } catch (err: any) {
      const msg = err?.data?.message || err?.error || 'Invalid or expired verification code.';
      setErrorMessage(msg);
    }
  };

  // Step 3: Set New Password via Redux
  const handleResetPassword = async () => {
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      await resetPasswordApi({
        email: cleanEmail,
        code: code.trim(),
        newPassword,
      }).unwrap();
      setStep('success');
    } catch (err: any) {
      const msg = err?.data?.message || err?.error || 'Failed to reset password. Please try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Top Bar with Back Navigation */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                if (step === 'verify') setStep('request');
                else if (step === 'new_password') setStep('verify');
                else router.back();
              }}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepDot,
                  step === 'request' || step === 'verify' || step === 'new_password' || step === 'success'
                    ? styles.stepDotActive
                    : null,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  step === 'verify' || step === 'new_password' || step === 'success'
                    ? styles.stepDotActive
                    : null,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  step === 'new_password' || step === 'success'
                    ? styles.stepDotActive
                    : null,
                ]}
              />
            </View>
          </View>

          {/* STEP 1: REQUEST CODE */}
          {step === 'request' && (
            <View>
              <View style={styles.headerSection}>
                <Image
                  source={require('@/../assets/images/icon-symbol.png')}
                  style={styles.brandIcon}
                  resizeMode="contain"
                />
                <Text style={styles.title}>Forgot Password? 🔑</Text>
                <Text style={styles.subtitle}>
                  Enter the email associated with your MediRem account and we will send you a 6-digit verification code.
                </Text>
              </View>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@example.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSendCode}
                  style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                  disabled={isLoading}
                  activeOpacity={0.85}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                      <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.replace('/sign-in')}
                  style={styles.secondaryLink}
                  activeOpacity={0.7}>
                  <Text style={styles.secondaryLinkText}>
                    Remembered password? <Text style={styles.boldText}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: VERIFY CODE */}
          {step === 'verify' && (
            <View>
              <View style={styles.headerSection}>
                <View style={styles.badgeCircle}>
                  <Ionicons name="mail-unread-outline" size={32} color="#208AEF" />
                </View>
                <Text style={styles.title}>Enter 6-Digit Code ✉️</Text>
                <Text style={styles.subtitle}>
                  We sent a verification code to <Text style={{ fontWeight: '700', color: '#0F172A' }}>{email}</Text>. Please enter it below.
                </Text>
              </View>

              {infoMessage && (
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle" size={16} color="#0284C7" />
                  <Text style={styles.infoBannerText}>{infoMessage}</Text>
                </View>
              )}

              {receivedCode && (
                <View style={styles.infoBanner}>
                  <Ionicons name="key-outline" size={16} color="#0284C7" />
                  <Text style={styles.infoBannerText}>
                    Dev Code: <Text style={{ fontWeight: '800' }}>{receivedCode}</Text> (sent via Nodemailer)
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
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="key-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, styles.codeInput]}
                      placeholder="• • • • • •"
                      placeholderTextColor="#94A3B8"
                      value={code}
                      onChangeText={(val) => {
                        setCode(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleVerifyCode}
                  style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                  disabled={isLoading}
                  activeOpacity={0.85}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Verify Code</Text>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSendCode}
                  style={styles.secondaryLink}
                  activeOpacity={0.7}>
                  <Text style={styles.secondaryLinkText}>
                    {"Didn't receive the email?"} <Text style={styles.boldText}>Resend Code</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 'new_password' && (
            <View>
              <View style={styles.headerSection}>
                <View style={styles.badgeCircle}>
                  <Ionicons name="shield-checkmark-outline" size={32} color="#10B981" />
                </View>
                <Text style={styles.title}>Create New Password 🛡️</Text>
                <Text style={styles.subtitle}>
                  Enter and confirm your new secure password for MediRem.
                </Text>
              </View>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#94A3B8"
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      secureTextEntry={!showPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.eyeIcon}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#94A3B8"
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      secureTextEntry={!showConfirmPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      style={styles.eyeIcon}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                  disabled={isLoading}
                  activeOpacity={0.85}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Update Password</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <View style={styles.successSection}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark-done" size={44} color="#10B981" />
              </View>
              <Text style={styles.title}>Password Updated! 🎉</Text>
              <Text style={styles.subtitle}>
                Your password has been reset successfully. You can now log into your MediRem account with your new credentials.
              </Text>

              <TouchableOpacity
                onPress={() => router.replace('/sign-in')}
                style={styles.primaryButton}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Go to Sign In</Text>
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 22,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  stepDotActive: {
    backgroundColor: '#208AEF',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  brandIcon: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 16,
  },
  badgeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
  formContainer: {
    gap: 16,
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
  codeInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  eyeIcon: {
    padding: 6,
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryLinkText: {
    fontSize: 14,
    color: '#64748B',
  },
  boldText: {
    fontWeight: '700',
    color: '#208AEF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
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
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#0369A1',
    flex: 1,
  },
  successSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 12,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
