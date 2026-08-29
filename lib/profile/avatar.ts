import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { bilt } from '@/lib/bilt';

const AVATAR_BUCKET = 'avatars';

export interface PickedAvatar {
  uri: string;
  /** Base64 payload when the picker returns one, used for native uploads. */
  base64: string | null;
  mimeType: string;
}

/** Thrown with wording the profile screen can show as-is. */
export class AvatarError extends Error {}

/**
 * Opens the photo library and returns a square-cropped image, or null when the
 * user backs out.
 */
export async function pickAvatarImage(): Promise<PickedAvatar | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AvatarError(
      'Photo access is off, so we cannot open your library. You can skip the photo for now.',
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: Platform.OS !== 'web',
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    base64: asset.base64 ?? null,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

function decodeBase64(value: string): Uint8Array {
  const payload = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const binary = globalThis.atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function toUploadBody(avatar: PickedAvatar): Promise<Blob | Uint8Array> {
  const canDecode = typeof globalThis.atob === 'function';

  if (avatar.base64 && canDecode) {
    return decodeBase64(avatar.base64);
  }
  if (avatar.uri.startsWith('data:') && canDecode) {
    return decodeBase64(avatar.uri);
  }

  const response = await fetch(avatar.uri);
  if (Platform.OS === 'web') return await response.blob();
  return new Uint8Array(await response.arrayBuffer());
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

/** Uploads the photo into the user's own folder and returns its public URL. */
export async function uploadAvatar(userId: string, avatar: PickedAvatar): Promise<string> {
  let body: Blob | Uint8Array;
  try {
    body = await toUploadBody(avatar);
  } catch {
    throw new AvatarError('We could not read that photo. Pick another one or skip it for now.');
  }

  const path = `${userId}/avatar-${Date.now()}.${extensionFor(avatar.mimeType)}`;
  const { error } = await bilt.storage.from(AVATAR_BUCKET).upload(path, body, {
    contentType: avatar.mimeType,
    upsert: true,
  });

  if (error) {
    throw new AvatarError(
      'Your photo did not upload. Check your connection, or skip it and add one later.',
    );
  }

  const { data } = bilt.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
