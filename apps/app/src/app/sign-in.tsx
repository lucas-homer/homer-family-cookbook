import { router } from "expo-router";
import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Button, Group, ListRow, SheetSurface, Text, TextField } from "@/components/ui";
import { api, ApiError, authorName, inviteTokenFrom } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Sign in (or, when signed in, the account sheet with Sign out). Signup is
// invite-only and happens from the invite link.
export default function SignIn() {
  const { user, signIn, signOut } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [invite, setInvite] = React.useState("");
  const inviteToken = inviteTokenFrom(invite);
  const [resetSent, setResetSent] = React.useState(false);

  const forgot = async () => {
    if (!email.trim()) return setErrors({ email: "Enter your email, then tap Forgot password again." });
    setErrors({});
    try {
      await api.requestPasswordReset(email.trim());
      setResetSent(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setErrors({ form: "You're offline. Check your connection and try again." });
      else if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else setErrors({ form: "Couldn't send the reset email. Try again." });
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (user) {
    return (
      <SheetSurface title="Account" confirm={{ label: "Done", onPress: close }} fill>
        <View className="gap-2 px-4 pt-2">
          <Text variant="title2">{authorName(user)}</Text>
          <Text variant="subhead" className="text-muted-foreground">
            {user.email}
          </Text>
          <Group>
            <ListRow
              label="Sign out"
              destructive
              chevron={false}
              onPress={async () => {
                await signOut();
                close();
              }}
            />
          </Group>
        </View>
      </SheetSurface>
    );
  }

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      await signIn(email, password);
      close();
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setErrors({ form: "You're offline. Check your connection and try again." });
      else if (e instanceof ApiError) setErrors(Object.keys(e.fieldErrors).length ? e.fieldErrors : { form: "Couldn't sign in. Try again." });
      else setErrors({ form: "Couldn't sign in. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetSurface title="Sign in" cancel={{ label: "Cancel", onPress: close }} fill>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-3 px-4 pt-2" keyboardShouldPersistTaps="handled">
          <Text variant="callout" className="text-muted-foreground">
            Use the email and password you use on homerfamilycookbook.com.
          </Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            error={errors.email}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
            error={errors.password}
          />
          {errors.form ? (
            <Text variant="footnote" className="text-destructive">
              {errors.form}
            </Text>
          ) : null}
          <Button label="Sign in" block loading={busy} disabled={!email || !password} onPress={submit} />
          {resetSent ? (
            <Text variant="footnote" className="pt-2 text-muted-foreground">
              If {email.trim()} has an account, we sent it a link to choose a new password. It works for 1 hour.
            </Text>
          ) : (
            <Button label="Forgot password?" variant="text" size="sm" onPress={forgot} />
          )}
          <Text variant="section" className="pt-5">
            New to the cookbook?
          </Text>
          <TextField
            label="Invite link"
            value={invite}
            onChangeText={setInvite}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste the link from your invite"
            error={invite && !inviteToken ? "That doesn't look like an invite link." : undefined}
          />
          <Button label="Use invite" variant="secondary" block disabled={!inviteToken} onPress={() => inviteToken && router.replace(`/join/${inviteToken}`)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SheetSurface>
  );
}
