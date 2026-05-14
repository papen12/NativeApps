import * as FileSystem from "expo-file-system";
import { RefObject } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";

export type PaintStyle = "fill" | "stroke" | "fill_and_stroke";
export type StrokeCap = "butt" | "round" | "square";
export type StrokeJoin = "miter" | "round" | "bevel";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay";

export interface Paint {
    color: string;
    alpha: number;
    strokeWidth: number;
    style: PaintStyle;
    strokeCap: StrokeCap;
    strokeJoin: StrokeJoin;
    blendMode: BlendMode;
    shadow?: {
        dx: number;
        dy: number;
        radius: number;
        color: string;
    };
    strokeDash?: number[];
}

export interface PathPoint {
    type: "moveTo" | "lineTo" | "quadTo" | "cubicTo" | "close" | "arc";
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    cx?: number;
    cy?: number;
    radius?: number;
    startAngle?: number;
    endAngle?: number;
    clockwise?: boolean;
}

export interface Path {
    id: string;
    points: PathPoint[];
    paint: Paint;
    closed: boolean;
}

export interface CanvasLayer {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    paths: Path[];
    locked: boolean;
}

export interface CanvasState {
    width: number;
    height: number;
    backgroundColor: string;
    layers: CanvasLayer[];
    activeLayerId: string;
    history: CanvasSnapshot[];
    historyIndex: number;
}

export interface CanvasSnapshot {
    timestamp: number;
    layers: CanvasLayer[];
}

export function createPaint(overrides?: Partial<Paint>): Paint {
    return {
        color: "#000000",
        alpha: 1,
        strokeWidth: 4,
        style: "stroke",
        strokeCap: "round",
        strokeJoin: "round",
        blendMode: "normal",
        ...overrides,
    };
}

export function createPath(paint: Paint): Path {
    return {
        id: `path_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        points: [],
        paint,
        closed: false,
    };
}

export function pathMoveTo(path: Path, x: number, y: number): Path {
    return {
        ...path,
        points: [...path.points, { type: "moveTo", x, y }],
    };
}

export function pathLineTo(path: Path, x: number, y: number): Path {
    return {
        ...path,
        points: [...path.points, { type: "lineTo", x, y }],
    };
}

export function pathQuadTo(
    path: Path,
    x1: number,
    y1: number,
    x: number,
    y: number
): Path {
    return {
        ...path,
        points: [...path.points, { type: "quadTo", x1, y1, x, y }],
    };
}

export function pathCubicTo(
    path: Path,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number
): Path {
    return {
        ...path,
        points: [...path.points, { type: "cubicTo", x1, y1, x2, y2, x, y }],
    };
}

export function pathArc(
    path: Path,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean = true
): Path {
    return {
        ...path,
        points: [
            ...path.points,
            { type: "arc", cx, cy, radius, startAngle, endAngle, clockwise },
        ],
    };
}

export function pathClose(path: Path): Path {
    return {
        ...path,
        points: [...path.points, { type: "close" }],
        closed: true,
    };
}

export function pathToSvgD(path: Path): string {
    return path.points
        .map((p) => {
            switch (p.type) {
                case "moveTo":
                    return `M ${p.x} ${p.y}`;
                case "lineTo":
                    return `L ${p.x} ${p.y}`;
                case "quadTo":
                    return `Q ${p.x1} ${p.y1} ${p.x} ${p.y}`;
                case "cubicTo":
                    return `C ${p.x1} ${p.y1} ${p.x2} ${p.y2} ${p.x} ${p.y}`;
                case "arc": {
                    const start = polarToCartesian(p.cx!, p.cy!, p.radius!, p.startAngle!);
                    const end = polarToCartesian(p.cx!, p.cy!, p.radius!, p.endAngle!);
                    const largeArc =
                        Math.abs(p.endAngle! - p.startAngle!) > 180 ? 1 : 0;
                    const sweep = p.clockwise ? 1 : 0;
                    return `M ${start.x} ${start.y} A ${p.radius} ${p.radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
                }
                case "close":
                    return "Z";
                default:
                    return "";
            }
        })
        .join(" ");
}

function polarToCartesian(
    cx: number,
    cy: number,
    r: number,
    angleDeg: number
): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function paintToSvgProps(paint: Paint): Record<string, string | number> {
    const props: Record<string, string | number> = {};

    if (paint.style === "fill" || paint.style === "fill_and_stroke") {
        props.fill = paint.color;
        props.fillOpacity = paint.alpha;
    } else {
        props.fill = "none";
    }

    if (paint.style === "stroke" || paint.style === "fill_and_stroke") {
        props.stroke = paint.color;
        props.strokeWidth = paint.strokeWidth;
        props.strokeOpacity = paint.alpha;
        props.strokeLinecap = paint.strokeCap;
        props.strokeLinejoin = paint.strokeJoin;
        if (paint.strokeDash && paint.strokeDash.length > 0) {
            props.strokeDasharray = paint.strokeDash.join(" ");
        }
    }

    return props;
}

export function createLayer(name: string): CanvasLayer {
    return {
        id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        visible: true,
        opacity: 1,
        paths: [],
        locked: false,
    };
}

export function createCanvasState(
    width: number,
    height: number,
    backgroundColor: string = "#FFFFFF"
): CanvasState {
    const defaultLayer = createLayer("Layer 1");
    return {
        width,
        height,
        backgroundColor,
        layers: [defaultLayer],
        activeLayerId: defaultLayer.id,
        history: [],
        historyIndex: -1,
    };
}

export function addPathToLayer(
    state: CanvasState,
    layerId: string,
    path: Path
): CanvasState {
    const snapshot: CanvasSnapshot = {
        timestamp: Date.now(),
        layers: JSON.parse(JSON.stringify(state.layers)),
    };

    const newHistory = state.history.slice(0, state.historyIndex + 1);

    return {
        ...state,
        layers: state.layers.map((l) =>
            l.id === layerId ? { ...l, paths: [...l.paths, path] } : l
        ),
        history: [...newHistory, snapshot],
        historyIndex: newHistory.length,
    };
}

export function updateLastPath(
    state: CanvasState,
    layerId: string,
    updatedPath: Path
): CanvasState {
    return {
        ...state,
        layers: state.layers.map((l) => {
            if (l.id !== layerId) return l;
            const paths = [...l.paths];
            paths[paths.length - 1] = updatedPath;
            return { ...l, paths };
        }),
    };
}

export function undoCanvas(state: CanvasState): CanvasState {
    if (state.historyIndex < 0) return state;
    const snapshot = state.history[state.historyIndex];
    return {
        ...state,
        layers: JSON.parse(JSON.stringify(snapshot.layers)),
        historyIndex: state.historyIndex - 1,
    };
}

export function redoCanvas(state: CanvasState): CanvasState {
    if (state.historyIndex >= state.history.length - 1) return state;
    const nextIndex = state.historyIndex + 1;
    const snapshot = state.history[nextIndex + 1] ?? state.history[nextIndex];
    return {
        ...state,
        layers: JSON.parse(JSON.stringify(snapshot.layers)),
        historyIndex: nextIndex,
    };
}

export function clearActiveLayer(state: CanvasState): CanvasState {
    const snapshot: CanvasSnapshot = {
        timestamp: Date.now(),
        layers: JSON.parse(JSON.stringify(state.layers)),
    };
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
        ...state,
        layers: state.layers.map((l) =>
            l.id === state.activeLayerId ? { ...l, paths: [] } : l
        ),
        history: [...newHistory, snapshot],
        historyIndex: newHistory.length,
    };
}

export function addLayer(state: CanvasState, name?: string): CanvasState {
    const layer = createLayer(name ?? `Layer ${state.layers.length + 1}`);
    return {
        ...state,
        layers: [...state.layers, layer],
        activeLayerId: layer.id,
    };
}

export function toggleLayerVisibility(
    state: CanvasState,
    layerId: string
): CanvasState {
    return {
        ...state,
        layers: state.layers.map((l) =>
            l.id === layerId ? { ...l, visible: !l.visible } : l
        ),
    };
}

export async function exportCanvasAsPng(
    viewRef: RefObject<View>,
    filename: string = "canvas_export"
): Promise<string> {
    const uri = await captureRef(viewRef, {
        format: "png",
        quality: 1,
    });

    const fs: any = FileSystem;

    const dest = `${fs.documentDirectory}${filename}_${Date.now()}.png`;

    await fs.moveAsync({ from: uri, to: dest });
    return dest;
}

export function buildEraserPaint(size: number): Paint {
    return createPaint({
        color: "#FFFFFF",
        strokeWidth: size,
        style: "stroke",
        strokeCap: "round",
        strokeJoin: "round",
        alpha: 1,
    });
}

export type DrawingTool =
    | "pen"
    | "brush"
    | "eraser"
    | "line"
    | "rect"
    | "circle"
    | "arrow";

export interface ToolPreset {
    tool: DrawingTool;
    paint: Paint;
    label: string;
    emoji: string;
}

export const DEFAULT_PRESETS: ToolPreset[] = [
    {
        tool: "pen",
        label: "Pen",
        emoji: "✏️",
        paint: createPaint({ color: "#0E3FA9", strokeWidth: 3, strokeCap: "round" }),
    },
    {
        tool: "brush",
        label: "Brush",
        emoji: "🖌️",
        paint: createPaint({ color: "#FFA903", strokeWidth: 14, strokeCap: "round", alpha: 0.7 }),
    },
    {
        tool: "eraser",
        label: "Eraser",
        emoji: "🧽",
        paint: buildEraserPaint(20),
    },
    {
        tool: "line",
        label: "Line",
        emoji: "📏",
        paint: createPaint({ color: "#333333", strokeWidth: 2, strokeCap: "butt" }),
    },
    {
        tool: "rect",
        label: "Rect",
        emoji: "⬛",
        paint: createPaint({ color: "#0E3FA9", strokeWidth: 2, style: "stroke" }),
    },
    {
        tool: "circle",
        label: "Circle",
        emoji: "⭕",
        paint: createPaint({ color: "#FFA903", strokeWidth: 2, style: "stroke" }),
    },
];