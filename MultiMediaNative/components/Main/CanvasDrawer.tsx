import {
    ChevronDown,
    Download,
    Eye,
    EyeOff,
    Layers,
    Plus,
    Redo2,
    Trash2,
    Undo2
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    GestureResponderEvent,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Svg, { Circle, G, Line, Rect, Path as SvgPath } from "react-native-svg";

import {
    CanvasLayer,
    CanvasState,
    DEFAULT_PRESETS,
    DrawingTool,
    Paint,
    Path,
    ToolPreset,
    addLayer,
    addPathToLayer,
    buildEraserPaint,
    clearActiveLayer,
    createCanvasState,
    createPaint,
    createPath,
    exportCanvasAsPng,
    paintToSvgProps,
    pathClose,
    pathLineTo,
    pathMoveTo,
    pathQuadTo,
    pathToSvgD,
    redoCanvas,
    toggleLayerVisibility,
    undoCanvas,
    updateLastPath,
} from "@/service/CanvasService";

const { width: SW, height: SH } = Dimensions.get("window");
const CANVAS_W = SW - 60;
const CANVAS_H = SH * 0.72;

const COLORS = [
    "#000000", "#FFFFFF", "#0E3FA9", "#FFA903",
    "#e74c3c", "#2ecc71", "#9b59b6", "#1abc9c",
    "#e67e22", "#34495e", "#f39c12", "#d35400",
    "#16a085", "#8e44ad", "#2980b9", "#c0392b",
];

const STROKE_SIZES = [2, 4, 8, 14, 22, 32];

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

interface ShapePreview {
    tool: DrawingTool;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    paint: Paint;
}

function renderShapePreview(preview: ShapePreview | null) {
    if (!preview) return null;
    const { tool, x1, y1, x2, y2, paint } = preview;
    const props = paintToSvgProps(paint);
    const svgProps: any = {
        stroke: props.stroke ?? "none",
        strokeWidth: Number(props.strokeWidth ?? 2),
        fill: String(props.fill ?? "none"),
        strokeOpacity: Number(props.strokeOpacity ?? 1),
        strokeLinecap: String(props.strokeLinecap ?? "round"),
    };

    if (tool === "rect") {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);
        return <Rect x={rx} y={ry} width={rw} height={rh} {...svgProps} />;
    }
    if (tool === "circle") {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
        return <Circle cx={cx} cy={cy} r={r} {...svgProps} />;
    }
    if (tool === "line" || tool === "arrow") {
        return <Line x1={x1} y1={y1} x2={x2} y2={y2} {...svgProps} />;
    }
    return null;
}

function LayerPanel({
    state,
    onToggleVisibility,
    onSetActive,
    onAddLayer,
    onClose,
}: {
    state: CanvasState;
    onToggleVisibility: (id: string) => void;
    onSetActive: (id: string) => void;
    onAddLayer: () => void;
    onClose: () => void;
}) {
    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={layerStyles.backdrop}>
                <View style={layerStyles.panel}>
                    <View style={layerStyles.panelHeader}>
                        <Text style={layerStyles.panelTitle}>Capas</Text>
                        <TouchableOpacity onPress={onAddLayer} style={layerStyles.addBtn}>
                            <Plus size={16} color="#0E3FA9" />
                            <Text style={layerStyles.addText}>Nueva</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={layerStyles.closeBtn}>
                            <ChevronDown size={20} color="#555" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        {[...state.layers].reverse().map((layer) => {
                            const isActive = layer.id === state.activeLayerId;
                            return (
                                <TouchableOpacity
                                    key={layer.id}
                                    style={[layerStyles.layerRow, isActive && layerStyles.layerRowActive]}
                                    onPress={() => { onSetActive(layer.id); onClose(); }}
                                >
                                    <TouchableOpacity
                                        onPress={() => onToggleVisibility(layer.id)}
                                        style={layerStyles.visBtn}
                                    >
                                        {layer.visible ? (
                                            <Eye size={16} color={isActive ? "#fff" : "#0E3FA9"} />
                                        ) : (
                                            <EyeOff size={16} color="#aaa" />
                                        )}
                                    </TouchableOpacity>
                                    <Text style={[layerStyles.layerName, isActive && layerStyles.layerNameActive]}>
                                        {layer.name}
                                    </Text>
                                    <Text style={layerStyles.pathCount}>{layer.paths.length} trazos</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const layerStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    panel: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SH * 0.5,
        paddingBottom: 30,
    },
    panelHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        gap: 8,
    },
    panelTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        color: "#0E3FA9",
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(14,63,169,0.08)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addText: {
        fontSize: 13,
        color: "#0E3FA9",
        fontWeight: "600",
    },
    closeBtn: {
        padding: 4,
    },
    layerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    layerRowActive: {
        backgroundColor: "#0E3FA9",
        marginHorizontal: 12,
        borderRadius: 10,
    },
    visBtn: {
        padding: 2,
    },
    layerName: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: "#222",
    },
    layerNameActive: {
        color: "#fff",
    },
    pathCount: {
        fontSize: 11,
        color: "#aaa",
    },
});

export default function CanvasDrawer() {
    const canvasRef = useRef<View>(null);
    const [state, setState] = useState<CanvasState>(
        createCanvasState(CANVAS_W, CANVAS_H, "#FFFFFF")
    );
    const [activeTool, setActiveTool] = useState<DrawingTool>("pen");
    const [activePaint, setActivePaint] = useState<Paint>(
        createPaint({ color: "#0E3FA9", strokeWidth: 4, strokeCap: "round" })
    );
    const [selectedColor, setSelectedColor] = useState("#0E3FA9");
    const [selectedSize, setSelectedSize] = useState(4);
    const [selectedAlpha, setSelectedAlpha] = useState(1);
    const [showLayers, setShowLayers] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSizePanel, setShowSizePanel] = useState(false);
    const [shapePreview, setShapePreview] = useState<ShapePreview | null>(null);
    const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const activeLayerId = state.activeLayerId;

    function buildCurrentPaint(tool: DrawingTool = activeTool): Paint {
        if (tool === "eraser") return buildEraserPaint(selectedSize * 3);
        return createPaint({
            color: selectedColor,
            strokeWidth: selectedSize,
            alpha: selectedAlpha,
            strokeCap: tool === "pen" ? "round" : "butt",
            strokeJoin: "round",
            style: tool === "rect" || tool === "circle" ? "stroke" : "stroke",
        });
    }

    const isShapeTool = (t: DrawingTool) =>
        t === "rect" || t === "circle" || t === "line" || t === "arrow";

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (e: GestureResponderEvent) => {
                const { locationX: x, locationY: y } = e.nativeEvent;
                const paint = buildCurrentPaint();

                if (isShapeTool(activeTool)) {
                    setShapeStart({ x, y });
                    setShapePreview({ tool: activeTool, x1: x, y1: y, x2: x, y2: y, paint });
                    return;
                }

                const path = pathMoveTo(createPath(paint), x, y);
                setState((prev) => addPathToLayer(prev, activeLayerId, path));
                setIsDrawing(true);
            },

            onPanResponderMove: (e: GestureResponderEvent) => {
                const { locationX: x, locationY: y } = e.nativeEvent;

                if (isShapeTool(activeTool) && shapeStart) {
                    setShapePreview((prev) =>
                        prev ? { ...prev, x2: x, y2: y } : null
                    );
                    return;
                }

                setState((prev) => {
                    const layer = prev.layers.find((l) => l.id === activeLayerId);
                    if (!layer || layer.paths.length === 0) return prev;
                    const last = layer.paths[layer.paths.length - 1];
                    const lastPoint = last.points[last.points.length - 1];
                    const lx = lastPoint?.x ?? x;
                    const ly = lastPoint?.y ?? y;
                    const mx = (lx + x) / 2;
                    const my = (ly + y) / 2;
                    const updated = pathQuadTo(last, lx, ly, mx, my);
                    return updateLastPath(prev, activeLayerId, updated);
                });
            },

            onPanResponderRelease: (e: GestureResponderEvent) => {
                const { locationX: x, locationY: y } = e.nativeEvent;

                if (isShapeTool(activeTool) && shapeStart) {
                    const paint = buildCurrentPaint();
                    let path = pathMoveTo(createPath(paint), shapeStart.x, shapeStart.y);

                    if (activeTool === "line" || activeTool === "arrow") {
                        path = pathLineTo(path, x, y);
                    } else if (activeTool === "rect") {
                        path = pathLineTo(path, x, shapeStart.y);
                        path = pathLineTo(path, x, y);
                        path = pathLineTo(path, shapeStart.x, y);
                        path = pathClose(path);
                    } else if (activeTool === "circle") {
                        const cx = (shapeStart.x + x) / 2;
                        const cy = (shapeStart.y + y) / 2;
                        const rx = Math.abs(x - shapeStart.x) / 2;
                        const ry = Math.abs(y - shapeStart.y) / 2;
                        path = pathLineTo(path, cx + rx, cy);
                    }

                    setState((prev) => addPathToLayer(prev, activeLayerId, path));
                    setShapeStart(null);
                    setShapePreview(null);
                    return;
                }

                setIsDrawing(false);
            },
        })
    ).current;

    function handleUndo() {
        setState((prev) => undoCanvas(prev));
    }

    function handleRedo() {
        setState((prev) => redoCanvas(prev));
    }

    function handleClear() {
        Alert.alert("Limpiar capa", "¿Borrar todos los trazos de la capa activa?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Limpiar", style: "destructive", onPress: () => setState((prev) => clearActiveLayer(prev)) },
        ]);
    }

    async function handleExport() {
        try {
            const path = await exportCanvasAsPng(canvasRef as any, "dibujo");
            Alert.alert("Exportado", `Guardado en:\n${path}`);
        } catch {
            Alert.alert("Error", "No se pudo exportar la imagen.");
        }
    }

    function selectTool(preset: ToolPreset) {
        setActiveTool(preset.tool);
        if (preset.tool !== "eraser") {
            setSelectedColor(preset.paint.color);
            setSelectedSize(preset.paint.strokeWidth);
            setSelectedAlpha(preset.paint.alpha);
        }
        setActivePaint(preset.paint);
    }

    function selectColor(color: string) {
        setSelectedColor(color);
        setActivePaint((p) => ({ ...p, color }));
        setShowColorPicker(false);
    }

    function selectSize(size: number) {
        setSelectedSize(size);
        setActivePaint((p) => ({ ...p, strokeWidth: size }));
        setShowSizePanel(false);
    }

    const activeLayer = state.layers.find((l) => l.id === activeLayerId);

    return (
        <View style={styles.root}>
            <View style={styles.topBar}>
                <View style={styles.topLeft}>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleUndo}>
                        <Undo2 size={18} color="#0E3FA9" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleRedo}>
                        <Redo2 size={18} color="#0E3FA9" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleClear}>
                        <Trash2 size={18} color="#e74c3c" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.topTitle}>Canvas</Text>

                <View style={styles.topRight}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setShowLayers(true)}>
                        <Layers size={18} color="#0E3FA9" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleExport}>
                        <Download size={18} color="#0E3FA9" />
                    </TouchableOpacity>
                </View>
            </View>

            <View ref={canvasRef} style={styles.canvasWrap} collapsable={false}>
                <View
                    style={[styles.canvas, { backgroundColor: state.backgroundColor }]}
                    {...panResponder.panHandlers}
                >
                    <Svg width={CANVAS_W} height={CANVAS_H}>
                        {state.layers
                            .filter((l) => l.visible)
                            .map((layer: CanvasLayer) => (
                                <G key={layer.id} opacity={layer.opacity}>
                                    {layer.paths.map((path: Path) => {
                                        const d = pathToSvgD(path);
                                        const props = paintToSvgProps(path.paint);
                                        return (
                                            <SvgPath
                                                key={path.id}
                                                d={d}
                                                stroke={String(props.stroke ?? "none")}
                                                strokeWidth={Number(props.strokeWidth ?? 2)}
                                                fill={String(props.fill ?? "none")}
                                                strokeOpacity={Number(props.strokeOpacity ?? 1)}
                                                strokeLinecap={String(props.strokeLinecap ?? "round") as any}
                                                strokeLinejoin={String(props.strokeLinejoin ?? "round") as any}
                                                strokeDasharray={
                                                    props.strokeDasharray ? String(props.strokeDasharray) : undefined
                                                }
                                            />
                                        );
                                    })}
                                </G>
                            ))}
                        {renderShapePreview(shapePreview)}
                    </Svg>
                </View>
            </View>

            <View style={styles.bottomBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolScroll}>
                    {DEFAULT_PRESETS.map((preset) => {
                        const isActive = activeTool === preset.tool;
                        return (
                            <TouchableOpacity
                                key={preset.tool}
                                style={[styles.toolBtn, isActive && styles.toolBtnActive]}
                                onPress={() => selectTool(preset)}
                            >
                                <Text style={styles.toolEmoji}>{preset.emoji}</Text>
                                <Text style={[styles.toolLabel, isActive && styles.toolLabelActive]}>
                                    {preset.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.controlRow}>
                    <TouchableOpacity
                        style={[styles.colorDot, { backgroundColor: selectedColor }]}
                        onPress={() => setShowColorPicker(!showColorPicker)}
                    />

                    <TouchableOpacity
                        style={styles.sizeBtn}
                        onPress={() => setShowSizePanel(!showSizePanel)}
                    >
                        <View
                            style={{
                                width: Math.min(selectedSize * 2, 28),
                                height: Math.min(selectedSize * 2, 28),
                                borderRadius: 100,
                                backgroundColor: selectedColor,
                                minWidth: 6,
                                minHeight: 6,
                            }}
                        />
                    </TouchableOpacity>

                    <View style={styles.alphaRow}>
                        {[0.25, 0.5, 0.75, 1].map((a) => (
                            <TouchableOpacity
                                key={a}
                                style={[
                                    styles.alphaBtn,
                                    { opacity: a },
                                    selectedAlpha === a && styles.alphaBtnActive,
                                ]}
                                onPress={() => {
                                    setSelectedAlpha(a);
                                    setActivePaint((p) => ({ ...p, alpha: a }));
                                }}
                            >
                                <View
                                    style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: 8,
                                        backgroundColor: selectedColor,
                                    }}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.layerBadge}>
                        <Text style={styles.layerBadgeText} numberOfLines={1}>
                            {activeLayer?.name ?? "Layer"}
                        </Text>
                    </View>
                </View>

                {showColorPicker && (
                    <View style={styles.colorGrid}>
                        {COLORS.map((c) => (
                            <TouchableOpacity
                                key={c}
                                style={[
                                    styles.colorCell,
                                    { backgroundColor: c },
                                    selectedColor === c && styles.colorCellSelected,
                                ]}
                                onPress={() => selectColor(c)}
                            />
                        ))}
                    </View>
                )}

                {showSizePanel && (
                    <View style={styles.sizeRow}>
                        {STROKE_SIZES.map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.sizeDot, selectedSize === s && styles.sizeDotSelected]}
                                onPress={() => selectSize(s)}
                            >
                                <View
                                    style={{
                                        width: Math.min(s * 2, 32),
                                        height: Math.min(s * 2, 32),
                                        borderRadius: 100,
                                        backgroundColor: selectedColor,
                                        minWidth: 4,
                                        minHeight: 4,
                                    }}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {showLayers && (
                <LayerPanel
                    state={state}
                    onToggleVisibility={(id) =>
                        setState((prev) => toggleLayerVisibility(prev, id))
                    }
                    onSetActive={(id) =>
                        setState((prev) => ({ ...prev, activeLayerId: id }))
                    }
                    onAddLayer={() =>
                        setState((prev) => addLayer(prev))
                    }
                    onClose={() => setShowLayers(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#f4f6fb",
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    topLeft: {
        flexDirection: "row",
        gap: 4,
        flex: 1,
    },
    topRight: {
        flexDirection: "row",
        gap: 4,
        flex: 1,
        justifyContent: "flex-end",
    },
    topTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0E3FA9",
        flex: 1,
        textAlign: "center",
    },
    iconBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "rgba(14,63,169,0.06)",
    },
    canvasWrap: {
        margin: 12,
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    canvas: {
        width: CANVAS_W,
        height: CANVAS_H,
    },
    bottomBar: {
        backgroundColor: "#fff",
        paddingTop: 10,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingHorizontal: 12,
        gap: 10,
    },
    toolScroll: {
        flexGrow: 0,
    },
    toolBtn: {
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 8,
        backgroundColor: "rgba(14,63,169,0.06)",
    },
    toolBtnActive: {
        backgroundColor: "#0E3FA9",
    },
    toolEmoji: {
        fontSize: 18,
    },
    toolLabel: {
        fontSize: 10,
        color: "#0E3FA9",
        fontWeight: "600",
        marginTop: 2,
    },
    toolLabelActive: {
        color: "#fff",
    },
    controlRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    colorDot: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: "#ddd",
    },
    sizeBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "rgba(14,63,169,0.06)",
        justifyContent: "center",
        alignItems: "center",
    },
    alphaRow: {
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
    },
    alphaBtn: {
        padding: 3,
        borderRadius: 10,
    },
    alphaBtnActive: {
        borderWidth: 2,
        borderColor: "#0E3FA9",
        borderRadius: 10,
    },
    layerBadge: {
        flex: 1,
        backgroundColor: "rgba(14,63,169,0.08)",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    layerBadgeText: {
        fontSize: 11,
        color: "#0E3FA9",
        fontWeight: "600",
    },
    colorGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingTop: 4,
    },
    colorCell: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },
    colorCellSelected: {
        borderWidth: 3,
        borderColor: "#0E3FA9",
    },
    sizeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingTop: 4,
    },
    sizeDot: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(14,63,169,0.06)",
    },
    sizeDotSelected: {
        backgroundColor: "rgba(14,63,169,0.18)",
        borderWidth: 2,
        borderColor: "#0E3FA9",
    },
});