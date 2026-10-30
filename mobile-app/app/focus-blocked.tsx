import React from "react";
import { Redirect } from "expo-router";

export default function FocusBlockedScreen() {
  return <Redirect href={{ pathname: "/blocked", params: { type: "app" } }} />;
}
