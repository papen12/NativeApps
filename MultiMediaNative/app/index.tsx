import AuthTabs from "@/components/AuthTabs/AuthTabs";
import Main from "@/components/Main/Main";
import React from "react";
import { useAuth } from "../context/AuthContext";

export default function HomeScreen() {
  const { usuario } = useAuth();

  if (usuario) {
    return <Main />;
  }

  return <AuthTabs />;
}