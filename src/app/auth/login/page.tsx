"use client";

import React, { Suspense } from 'react';
import { LoginForm } from '@/components/Auth/LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

