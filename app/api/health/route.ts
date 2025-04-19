import { NextResponse } from 'next/server';
import { getStorageProvider } from '../../../app/utils/storage';
import { Anthropic } from '@anthropic-ai/sdk';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
} 