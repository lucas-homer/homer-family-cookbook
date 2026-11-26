import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Loading } from "@/components/screen";
import { Button, SheetSurface, Text, TextField } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Join from an invite link (familycookbook://join/<token>, or pasted on the
// sign-in sheet). Same rules as the website's /join page.
export default function Join() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { adopt } = useAuth();
  const invite = useQuery({ queryKey: ["invite", token], queryFn: () => api.invite(token), retry: false });
  const [fields, setFields] = React.useState({ email: "", firstName: "", lastName: "", password: "" });
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = (k: keyof typeof fields) => (v: string) => setFields((f) => ({ ...f, [k]: v }));

  // An invite for one address fixes the email field to it.
  const invitedEmail = invite.data?.invite.email ?? null;
  const email = invitedEmail ?? fields.email;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await api.join({ token, ...fields, email });
      await adopt({ token: res.token, user: res.user });
      router.replace("/");
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setErrors({ form: "You're offline. Check your connection and try again." });
      else if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else setErrors({ form: "Couldn't create your account. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const unavailable = invite.error instanceof ApiError ? invite.error.fieldErrors.form ?? "This invite link is not valid." : null;

  return (
    <SheetSurface title="Join the cookbook" cancel={{ label: "Cancel", onPress: close }} className="flex-1">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-3 px-4 pt-2" keyboardShouldPersistTaps="handled">
          {invite.isPending ? (
            <Loading />
          ) : unavailable || invite.isError ? (
            <>
              <Text variant="headline">{unavailable ?? "Couldn't check this invite."}</Text>
              <Button label="Close" variant="secondary" onPress={close} />
            </>
          ) : (
            <>
              <Text variant="callout" className="text-muted-foreground">
                You’re invited to the Homer Family Cookbook. Make your account to save favorites and add recipes.
              </Text>
              <TextField
                label="Email"
                value={email}
                onChangeText={set("email")}
                editable={!invitedEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                error={errors.email}
              />
              <TextField label="First name" value={fields.firstName} onChangeText={set("firstName")} autoComplete="given-name" textContentType="givenName" error={errors.firstName} />
              <TextField label="Last name (optional)" value={fields.lastName} onChangeText={set("lastName")} autoComplete="family-name" textContentType="familyName" error={errors.lastName} />
              <TextField
                label="Password"
                value={fields.password}
                onChangeText={set("password")}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                error={errors.password}
              />
              {errors.form ? (
                <Text variant="footnote" className="text-destructive">
                  {errors.form}
                </Text>
              ) : null}
              <Button label="Join" block loading={busy} disabled={!email || !fields.firstName || !fields.password} onPress={submit} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SheetSurface>
  );
}
