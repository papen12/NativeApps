import { SistemaUsuarios, Usuario } from "@/Models/Usuarios";
import React, { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const sistemaUsuarios = new SistemaUsuarios();

export function Login() {
    const [usuario, setUsuario] = useState("");
    const [password, setPassword] = useState("");
    const { setUsuario: setAuthUsuario } = useAuth();

    const handleLogin = () => {
        if (!usuario || !password) {
            Alert.alert("Error", "Completa todos los campos");
            return;
        }

        const found = sistemaUsuarios.ListaUsuarios.find(
            (u) => u.usuario === usuario && u.pass === password
        );

        if (!found) {
            Alert.alert("Error", "Credenciales incorrectas");
            return;
        }

        setAuthUsuario(found);
        setUsuario("");
        setPassword("");
    };

    return (
        <View style={styles.formContainer}>
            <Text style={styles.title}>Iniciar Sesión</Text>

            <TextInput
                style={styles.input}
                placeholder="Usuario"
                placeholderTextColor="#8FA3D0"
                value={usuario}
                onChangeText={setUsuario}
            />

            <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#8FA3D0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Entrar</Text>
            </TouchableOpacity>
        </View>
    );
}

export function SignUp() {
    const [usuario, setUsuario] = useState("");
    const [password, setPassword] = useState("");

    const handleSignUp = () => {
        if (!usuario || !password) {
            Alert.alert("Error", "Completa todos los campos");
            return;
        }

        const existe = sistemaUsuarios.ListaUsuarios.some(
            (u) => u.usuario === usuario
        );

        if (existe) {
            Alert.alert("Error", "El usuario ya existe");
            return;
        }

        const nuevoUsuario = new Usuario(usuario, password);
        sistemaUsuarios.ListaUsuarios.push(nuevoUsuario);

        Alert.alert(
            "Éxito",
            "Usuario registrado correctamente"
        );

        setUsuario("");
        setPassword("");
    };

    return (
        <View style={styles.formContainer}>
            <Text style={styles.title}>Registro</Text>

            <TextInput
                style={styles.input}
                placeholder="Usuario"
                placeholderTextColor="#8FA3D0"
                value={usuario}
                onChangeText={setUsuario}
            />

            <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#8FA3D0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleSignUp}>
                <Text style={styles.buttonText}>Registrar</Text>
            </TouchableOpacity>
        </View>
    );
}

export default function AuthTabs() {
    const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

    return (
        <View style={styles.mainContainer}>
            <View style={styles.card}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === "login"
                                ? styles.activeTab
                                : styles.inactiveTab,
                        ]}
                        onPress={() => setActiveTab("login")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "login"
                                    ? styles.activeTabText
                                    : styles.inactiveTabText,
                            ]}
                        >
                            Login
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === "signup"
                                ? styles.activeTab
                                : styles.inactiveTab,
                        ]}
                        onPress={() => setActiveTab("signup")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "signup"
                                    ? styles.activeTabText
                                    : styles.inactiveTabText,
                            ]}
                        >
                            Registro
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {activeTab === "login" ? <Login /> : <SignUp />}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: "#0E3FA9",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    card: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        paddingVertical: 30,
        paddingHorizontal: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    tabContainer: {
        flexDirection: "row",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 30,
        borderWidth: 2,
        borderColor: "#0E3FA9",
    },
    tabButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
    },
    activeTab: {
        backgroundColor: "#FFA903",
    },
    inactiveTab: {
        backgroundColor: "#FFFFFF",
    },
    tabText: {
        fontSize: 16,
        fontWeight: "700",
    },
    activeTabText: {
        color: "#FFFFFF",
    },
    inactiveTabText: {
        color: "#0E3FA9",
    },
    content: {
        width: "100%",
    },
    formContainer: {
        width: "100%",
        alignItems: "center",
    },
    title: {
        fontSize: 30,
        fontWeight: "700",
        color: "#0E3FA9",
        marginBottom: 30,
    },
    input: {
        width: "100%",
        borderWidth: 2,
        borderColor: "#0E3FA9",
        borderRadius: 10,
        padding: 14,
        marginBottom: 18,
        fontSize: 16,
        color: "#0E3FA9",
        backgroundColor: "#FFFFFF",
    },
    button: {
        width: "100%",
        backgroundColor: "#FFA903",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
    },
});