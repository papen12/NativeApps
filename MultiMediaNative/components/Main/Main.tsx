import { ChevronLeft, ChevronRight, PenSquare, Video, Volume2 } from "lucide-react-native";
import React, { useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import AudioPlayer from "./AudioPlayer";
import CanvasDrawer from "./CanvasDrawer";
import VideoPlayer from "./Videoplayer";

type Section = "audio" | "video" | "canvas";

const navItems: { id: Section; label: string; icon: (color: string) => React.ReactNode }[] = [
    { id: "audio", label: "Audio", icon: (c) => <Volume2 size={20} color={c} /> },
    { id: "video", label: "Video", icon: (c) => <Video size={20} color={c} /> },
    { id: "canvas", label: "Canvas", icon: (c) => <PenSquare size={20} color={c} /> },
];

function CanvasSection() {
    return (
        <View style={placeholderStyles.root}>
            <PenSquare size={48} color="#0E3FA9" />
            <Text style={placeholderStyles.title}>Canvas</Text>
            <Text style={placeholderStyles.sub}>Próximamente</Text>
        </View>
    );
}

const placeholderStyles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0E3FA9",
        marginTop: 8,
    },
    sub: {
        fontSize: 14,
        color: "#aaa",
    },
});

export default function Main() {
    const [active, setActive] = useState<Section>("audio");
    const [collapsed, setCollapsed] = useState(false);

    const sidebarWidth = collapsed ? 60 : 200;

    function renderSection() {
        switch (active) {
            case "audio":
                return <AudioPlayer />;
            case "video":
                return <VideoPlayer />;
            case "canvas":
                return <CanvasDrawer/>;
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.root}>
                <View style={[styles.sidebar, { width: sidebarWidth }]}>
                    <View style={styles.logoArea}>
                        {!collapsed && <Text style={styles.logoText}>Studio</Text>}
                    </View>

                    <View style={styles.nav}>
                        {navItems.map((item) => {
                            const isActive = active === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.navItem,
                                        collapsed && styles.navItemCollapsed,
                                        isActive && styles.navItemHighlight,
                                    ]}
                                    onPress={() => setActive(item.id)}
                                    activeOpacity={0.8}
                                >
                                    {item.icon(isActive ? "#0E3FA9" : "#fff")}
                                    {!collapsed && (
                                        <Text
                                            style={[
                                                styles.navLabel,
                                                isActive && styles.navLabelHighlight,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={styles.collapseBtn}
                        onPress={() => setCollapsed(!collapsed)}
                        activeOpacity={0.75}
                    >
                        {collapsed ? (
                            <ChevronRight size={18} color="#fff" />
                        ) : (
                            <ChevronLeft size={18} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>{renderSection()}</View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#0E3FA9",
    },
    root: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#fff",
    },
    sidebar: {
        backgroundColor: "#0E3FA9",
        flexDirection: "column",
        overflow: "hidden",
    },
    logoArea: {
        paddingHorizontal: 14,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.1)",
        minHeight: 64,
        justifyContent: "center",
    },
    logoText: {
        color: "#FFA903",
        fontWeight: "700",
        fontSize: 18,
        letterSpacing: 1,
    },
    nav: {
        flex: 1,
        paddingHorizontal: 8,
        paddingTop: 16,
        gap: 4,
    },
    navItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderRadius: 10,
    },
    navItemCollapsed: {
        justifyContent: "center",
        paddingHorizontal: 0,
        alignItems: "center",
    },
    navItemHighlight: {
        backgroundColor: "#FFA903",
    },
    navLabel: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "500",
    },
    navLabelHighlight: {
        color: "#0E3FA9",
        fontWeight: "700",
    },
    collapseBtn: {
        margin: 10,
        padding: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    content: {
        flex: 1,
        backgroundColor: "#fff",
    },
});