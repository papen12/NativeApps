import * as MediaLibrary from "expo-media-library";
import { PermissionsAndroid, Platform } from "react-native";

export interface VideoFile {
    id: string;
    filename: string;
    uri: string;
    duration: number;
    width: number;
    height: number;
    size: number;
    modificationTime: number;
    albumId: string | undefined;
    folder: string;
}

const TARGET_FOLDERS = [
    "/storage/emulated/0/DCIM",
    "/storage/emulated/0/Movies",
    "/storage/emulated/0/Download",
    "/storage/emulated/0/WhatsApp/Media/WhatsApp Video",
    "/storage/emulated/0/Telegram/Telegram Video",
    "/storage/emulated/0/Pictures",
];

const VIDEO_EXTENSIONS = [
    ".mp4", ".mkv", ".avi", ".mov", ".wmv",
    ".flv", ".webm", ".3gp", ".m4v", ".ts",
];

function isVideoFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getFolderFromUri(uri: string): string {
    const decoded = decodeURIComponent(uri);
    const match = TARGET_FOLDERS.find((folder) => decoded.includes(folder));
    return match ?? "Otros";
}

async function requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return false;

    const sdkVersion = parseInt(Platform.Version as any, 10);

    if (sdkVersion >= 33) {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function fetchAllVideoAssets(): Promise<MediaLibrary.Asset[]> {
    const assets: MediaLibrary.Asset[] = [];
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;

    while (hasNextPage) {
        const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.video,
            first: 100,
            after: endCursor,
            sortBy: [MediaLibrary.SortBy.modificationTime],
        });

        assets.push(...page.assets);
        hasNextPage = page.hasNextPage;
        endCursor = page.endCursor;
    }

    return assets;
}

function mapToVideoFile(asset: MediaLibrary.Asset): VideoFile {
    return {
        id: asset.id,
        filename: asset.filename,
        uri: asset.uri,
        duration: asset.duration,
        width: asset.width,
        height: asset.height,
        size: (asset as any).fileSize ?? 0,
        modificationTime: asset.modificationTime,
        albumId: asset.albumId,
        folder: getFolderFromUri(asset.uri),
    };
}

export async function searchVideoFiles(): Promise<VideoFile[]> {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
        throw new Error("Permiso de almacenamiento denegado.");
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
        throw new Error("Permiso de MediaLibrary denegado.");
    }

    const allAssets = await fetchAllVideoAssets();
    const validVideo = allAssets.filter((a) => isVideoFile(a.filename));

    return validVideo.map(mapToVideoFile);
}

export async function searchVideoByFolder(folderPath: string): Promise<VideoFile[]> {
    const all = await searchVideoFiles();
    return all.filter((v) => v.folder === folderPath);
}

export async function searchVideoByName(query: string): Promise<VideoFile[]> {
    const all = await searchVideoFiles();
    const lower = query.toLowerCase();
    return all.filter((v) => v.filename.toLowerCase().includes(lower));
}

export async function getVideoGroupedByFolder(): Promise<Record<string, VideoFile[]>> {
    const all = await searchVideoFiles();
    return all.reduce<Record<string, VideoFile[]>>((acc, video) => {
        if (!acc[video.folder]) acc[video.folder] = [];
        acc[video.folder].push(video);
        return acc;
    }, {});
}