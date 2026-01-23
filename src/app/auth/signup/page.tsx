"use client";

import React, { Suspense } from 'react';
import { SignupForm } from '@/components/Auth/SignupForm';

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}

