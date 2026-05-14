import { AudioFile, searchAudioFiles } from "@/service/Audiosearchservice";
import { Audio } from "expo-av";
import { Clock, FolderOpen, Music2, Pause, Play } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFolder(folder: string): string {
    const parts = folder.split("/");
    return parts[parts.length - 1] || folder;
}

function formatSize(bytes: number): string {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

interface WaveBarProps {
    isActive: boolean;
    delay: number;
}

function WaveBar({ isActive, delay }: WaveBarProps) {
    const anim = useRef(new Animated.Value(4)).current;

    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 18,
                        duration: 400 + delay * 100,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(anim, {
                        toValue: 4,
                        duration: 400 + delay * 100,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            anim.stopAnimation();
            Animated.timing(anim, {
                toValue: 4,
                duration: 150,
                useNativeDriver: false,
            }).start();
        }
    }, [isActive]);

    return (
        <Animated.View
            style={{
                width: 3,
                height: anim,
                backgroundColor: isActive ? "#FFA903" : "#0E3FA9",
                borderRadius: 2,
                marginHorizontal: 1.5,
                alignSelf: "center",
            }}
        />
    );
}

export default function AudioPlayer() {
    const [audios, setAudios] = useState<AudioFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
        });
        loadAudios();
        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    async function loadAudios() {
        try {
            setLoading(true);
            const result = await searchAudioFiles();
            setAudios(result);
        } catch (e: any) {
            setError(e.message ?? "Error al cargar audios");
        } finally {
            setLoading(false);
        }
    }

    async function playAudio(audio: AudioFile) {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }

        if (currentId === audio.id && isPlaying) {
            setIsPlaying(false);
            setCurrentId(null);
            return;
        }

        setCurrentId(audio.id);
        setIsPlaying(true);
        setPosition(0);

        const { sound } = await Audio.Sound.createAsync(
            { uri: audio.uri },
            { shouldPlay: true },
            (status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis / 1000);
                    setDuration((status.durationMillis ?? 0) / 1000);
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                        setCurrentId(null);
                    }
                }
            }
        );

        soundRef.current = sound;
    }

    async function togglePause() {
        if (!soundRef.current) return;
        if (isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
        } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
        }
    }

    const currentAudio = audios.find((a) => a.id === currentId);

    function renderItem({ item }: { item: AudioFile }) {
        const active = item.id === currentId;
        return (
            <TouchableOpacity
                style={[styles.item, active && styles.itemActive]}
                onPress={() => playAudio(item)}
                activeOpacity={0.75}
            >
                <View style={styles.itemLeft}>
                    <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                        {active ? (
                            <View style={styles.waveRow}>
                                {[0, 1, 2, 3].map((i) => (
                                    <WaveBar key={i} isActive={isPlaying} delay={i} />
                                ))}
                            </View>
                        ) : (
                            <Music2 size={18} color="#0E3FA9" />
                        )}
                    </View>
                    <View style={styles.itemInfo}>
                        <Text
                            style={[styles.itemName, active && styles.itemNameActive]}
                            numberOfLines={1}
                        >
                            {item.filename.replace(/\.[^.]+$/, "")}
                        </Text>
                        <View style={styles.itemMeta}>
                            <FolderOpen size={11} color="#888" style={{ marginRight: 3 }} />
                            <Text style={styles.metaText}>{formatFolder(item.folder)}</Text>
                            {item.duration > 0 && (
                                <>
                                    <Text style={styles.metaDot}>·</Text>
                                    <Clock size={11} color="#888" style={{ marginRight: 3 }} />
                                    <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>
                <View style={[styles.playBtn, active && styles.playBtnActive]}>
                    {active && isPlaying ? (
                        <Pause size={16} color={active ? "#0E3FA9" : "#fff"} />
                    ) : (
                        <Play size={16} color={active ? "#0E3FA9" : "#fff"} />
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0E3FA9" />
                <Text style={styles.loadingText}>Buscando audios...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadAudios}>
                    <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Biblioteca de Audio</Text>
                <Text style={styles.headerCount}>{audios.length} archivos encontrados</Text>
            </View>

            {currentAudio && (
                <View style={styles.nowPlaying}>
                    <View style={styles.nowInfo}>
                        <Text style={styles.nowLabel}>REPRODUCIENDO</Text>
                        <Text style={styles.nowName} numberOfLines={1}>
                            {currentAudio.filename.replace(/\.[^.]+$/, "")}
                        </Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: duration > 0 ? `${(position / duration) * 100}%` : "0%" },
                                ]}
                            />
                        </View>
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatDuration(position)}</Text>
                            <Text style={styles.timeText}>{formatDuration(duration)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.nowPlayBtn} onPress={togglePause}>
                        {isPlaying ? (
                            <Pause size={22} color="#fff" />
                        ) : (
                            <Play size={22} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={audios}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
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
    nowPlaying: {
        backgroundColor: "#0E3FA9",
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 14,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#0E3FA9",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    nowInfo: {
        flex: 1,
    },
    nowLabel: {
        fontSize: 9,
        color: "#FFA903",
        fontWeight: "700",
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    nowName: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "600",
        marginBottom: 10,
    },
    progressBar: {
        height: 3,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#FFA903",
        borderRadius: 2,
    },
    timeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },
    timeText: {
        fontSize: 10,
        color: "rgba(255,255,255,0.6)",
    },
    nowPlayBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#FFA903",
        justifyContent: "center",
        alignItems: "center",
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
        justifyContent: "space-between",
    },
    itemActive: {
        backgroundColor: "rgba(14,63,169,0.04)",
        borderRadius: 10,
        paddingHorizontal: 8,
    },
    itemLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 12,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "rgba(14,63,169,0.08)",
        justifyContent: "center",
        alignItems: "center",
    },
    iconWrapActive: {
        backgroundColor: "rgba(255,169,3,0.15)",
    },
    waveRow: {
        flexDirection: "row",
        alignItems: "center",
        height: 24,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1a1a1a",
        marginBottom: 3,
    },
    itemNameActive: {
        color: "#0E3FA9",
        fontWeight: "600",
    },
    itemMeta: {
        flexDirection: "row",
        alignItems: "center",
    },
    metaText: {
        fontSize: 11,
        color: "#999",
    },
    metaDot: {
        fontSize: 11,
        color: "#ccc",
        marginHorizontal: 4,
    },
    playBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#0E3FA9",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    playBtnActive: {
        backgroundColor: "#FFA903",
    },
});