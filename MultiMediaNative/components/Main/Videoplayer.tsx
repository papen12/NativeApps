import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    StatusBar,
    Modal,
    Animated,
    Easing,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import {
    Play,
    Pause,
    Film,
    FolderOpen,
    Clock,
    X,
    Maximize2,
    Volume2,
    VolumeX,
    RotateCcw,
} from "lucide-react-native";
import {searchVideoFiles, VideoFile } from "@/service/VideoSearchService"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFolder(folder: string): string {
    const parts = folder.split("/");
    return parts[parts.length - 1] || folder;
}

function formatResolution(w: number, h: number): string {
    if (!w || !h) return "";
    if (h >= 2160) return "4K";
    if (h >= 1080) return "1080p";
    if (h >= 720) return "720p";
    if (h >= 480) return "480p";
    return `${w}x${h}`;
}

interface ProgressBarProps {
    position: number;
    duration: number;
    onSeek: (ratio: number) => void;
}

function ProgressBar({ position, duration, onSeek }: ProgressBarProps) {
    const ratio = duration > 0 ? position / duration : 0;
    return (
        <TouchableOpacity
            style={progressStyles.track}
            onPress={(e) => {
                const x = e.nativeEvent.locationX;
                onSeek(Math.min(Math.max(x / (SCREEN_WIDTH - 48), 0), 1));
            }}
            activeOpacity={1}
        >
            <View style={[progressStyles.fill, { width: `${ratio * 100}%` }]} />
            <View style={[progressStyles.thumb, { left: `${ratio * 100}%` }]} />
        </TouchableOpacity>
    );
}

const progressStyles = StyleSheet.create({
    track: {
        height: 4,
        backgroundColor: "rgba(255,255,255,0.25)",
        borderRadius: 2,
        position: "relative",
        justifyContent: "center",
    },
    fill: {
        height: "100%",
        backgroundColor: "#FFA903",
        borderRadius: 2,
    },
    thumb: {
        position: "absolute",
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: "#FFA903",
        top: -5,
        marginLeft: -7,
    },
});

interface PlayerModalProps {
    video: VideoFile;
    onClose: () => void;
}

function PlayerModal({ video, onClose }: PlayerModalProps) {
    const videoRef = useRef<Video>(null);
    const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
    const [muted, setMuted] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsAnim = useRef(new Animated.Value(1)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isPlaying = status?.isLoaded && status.isPlaying;
    const position = status?.isLoaded ? status.positionMillis / 1000 : 0;
    const duration = status?.isLoaded ? (status.durationMillis ?? 0) / 1000 : 0;

    function showControls() {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        Animated.timing(controlsAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
        setControlsVisible(true);
        hideTimer.current = setTimeout(() => {
            Animated.timing(controlsAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => setControlsVisible(false));
        }, 3000);
    }

    useEffect(() => {
        showControls();
        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    async function togglePlay() {
        if (!videoRef.current) return;
        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
        showControls();
    }

    async function handleSeek(ratio: number) {
        if (!videoRef.current || !status?.isLoaded) return;
        const ms = ratio * (status.durationMillis ?? 0);
        await videoRef.current.setPositionAsync(ms);
        showControls();
    }

    async function restart() {
        if (!videoRef.current) return;
        await videoRef.current.setPositionAsync(0);
        await videoRef.current.playAsync();
        showControls();
    }

    return (
        <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <StatusBar hidden />
            <View style={modalStyles.root}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={showControls}
                >
                    <Video
                        ref={videoRef}
                        source={{ uri: video.uri }}
                        style={modalStyles.video}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        isMuted={muted}
                        onPlaybackStatusUpdate={(s) => setStatus(s)}
                    />
                </TouchableOpacity>

                <Animated.View style={[modalStyles.overlay, { opacity: controlsAnim }]}>
                    <View style={modalStyles.topBar}>
                        <TouchableOpacity style={modalStyles.iconBtn} onPress={onClose}>
                            <X size={22} color="#fff" />
                        </TouchableOpacity>
                        <Text style={modalStyles.videoTitle} numberOfLines={1}>
                            {video.filename.replace(/\.[^.]+$/, "")}
                        </Text>
                        <TouchableOpacity
                            style={modalStyles.iconBtn}
                            onPress={() => setMuted(!muted)}
                        >
                            {muted ? (
                                <VolumeX size={22} color="#fff" />
                            ) : (
                                <Volume2 size={22} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={modalStyles.centerControls}>
                        <TouchableOpacity style={modalStyles.secondaryBtn} onPress={restart}>
                            <RotateCcw size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={modalStyles.mainPlayBtn} onPress={togglePlay}>
                            {isPlaying ? (
                                <Pause size={32} color="#0E3FA9" />
                            ) : (
                                <Play size={32} color="#0E3FA9" />
                            )}
                        </TouchableOpacity>
                        <View style={{ width: 48 }} />
                    </View>

                    <View style={modalStyles.bottomBar}>
                        <ProgressBar
                            position={position}
                            duration={duration}
                            onSeek={handleSeek}
                        />
                        <View style={modalStyles.timeRow}>
                            <Text style={modalStyles.timeText}>{formatDuration(position)}</Text>
                            <Text style={modalStyles.timeText}>{formatDuration(duration)}</Text>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
    },
    video: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 12,
        backgroundColor: "rgba(0,0,0,0.55)",
        gap: 12,
    },
    iconBtn: {
        padding: 6,
        borderRadius: 8,
    },
    videoTitle: {
        flex: 1,
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    centerControls: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
    },
    secondaryBtn: {
        padding: 10,
    },
    mainPlayBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#FFA903",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#FFA903",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    bottomBar: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 12,
        backgroundColor: "rgba(0,0,0,0.55)",
        gap: 8,
    },
    timeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    timeText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 12,
    },
});

export default function VideoPlayer() {
    const [videos, setVideos] = useState<VideoFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<VideoFile | null>(null);

    useEffect(() => {
        loadVideos();
    }, []);

    async function loadVideos() {
        try {
            setLoading(true);
            setError(null);
            const result = await searchVideoFiles();
            setVideos(result);
        } catch (e: any) {
            setError(e.message ?? "Error al cargar videos");
        } finally {
            setLoading(false);
        }
    }

    function renderItem({ item }: { item: VideoFile }) {
        return (
            <TouchableOpacity
                style={styles.item}
                onPress={() => setSelected(item)}
                activeOpacity={0.75}
            >
                <View style={styles.thumbnail}>
                    <Film size={24} color="#0E3FA9" />
                    {item.width > 0 && (
                        <View style={styles.resBadge}>
                            <Text style={styles.resText}>
                                {formatResolution(item.width, item.height)}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                        {item.filename.replace(/\.[^.]+$/, "")}
                    </Text>
                    <View style={styles.itemMeta}>
                        <FolderOpen size={11} color="#888" />
                        <Text style={styles.metaText}>{formatFolder(item.folder)}</Text>
                        {item.duration > 0 && (
                            <>
                                <Text style={styles.metaDot}>·</Text>
                                <Clock size={11} color="#888" />
                                <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
                            </>
                        )}
                    </View>
                </View>

                <View style={styles.playBtn}>
                    <Play size={16} color="#fff" />
                </View>
            </TouchableOpacity>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0E3FA9" />
                <Text style={styles.loadingText}>Buscando videos...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Film size={48} color="#ccc" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadVideos}>
                    <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (videos.length === 0) {
        return (
            <View style={styles.center}>
                <Film size={48} color="#ccc" />
                <Text style={styles.emptyText}>No se encontraron videos</Text>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Biblioteca de Video</Text>
                <Text style={styles.headerCount}>{videos.length} videos encontrados</Text>
            </View>

            <FlatList
                data={videos}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {selected && (
                <PlayerModal video={selected} onClose={() => setSelected(null)} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#fff",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
    },
    loadingText: {
        color: "#0E3FA9",
        fontSize: 14,
        marginTop: 8,
    },
    errorText: {
        color: "#c0392b",
        fontSize: 14,
        textAlign: "center",
        paddingHorizontal: 24,
    },
    emptyText: {
        color: "#aaa",
        fontSize: 15,
        marginTop: 8,
    },
    retryBtn: {
        backgroundColor: "#0E3FA9",
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: "#fff",
        fontWeight: "600",
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0E3FA9",
        letterSpacing: 0.3,
    },
    headerCount: {
        fontSize: 12,
        color: "#888",
        marginTop: 2,
    },
    list: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    separator: {
        height: 1,
        backgroundColor: "#f5f5f5",
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 12,
    },
    thumbnail: {
        width: 64,
        height: 48,
        borderRadius: 8,
        backgroundColor: "rgba(14,63,169,0.08)",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
    },
    resBadge: {
        position: "absolute",
        bottom: 3,
        right: 3,
        backgroundColor: "#0E3FA9",
        borderRadius: 3,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    resText: {
        color: "#fff",
        fontSize: 8,
        fontWeight: "700",
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1a1a1a",
        marginBottom: 4,
        lineHeight: 19,
    },
    itemMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    metaText: {
        fontSize: 11,
        color: "#999",
    },
    metaDot: {
        fontSize: 11,
        color: "#ccc",
        marginHorizontal: 2,
    },
    playBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#0E3FA9",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
});