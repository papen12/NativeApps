export class Usuario {
    usuario: string;
    pass: string;

    constructor(usuario: string, pass: string) {
        this.usuario = usuario;
        this.pass = pass;
    }
}

export class SistemaUsuarios {
    ListaUsuarios: Usuario[];

    constructor() {
        this.ListaUsuarios = [
            new Usuario("papen", "papen")
        ];
    }
}