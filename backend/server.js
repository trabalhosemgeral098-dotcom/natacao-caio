const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();
app.use(cors());
app.use(express.json());
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "natacao",
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_HOST ? {rejectUnauthorized: false} : null
});

db.connect((erro) => {
    if(erro){
        console.log("Erro ao conectar");
        console.log(erro);
        return;
    }
    console.log("Conectado com sucesso");
    const criarTabelaSQL = `
    CREATE TABLE IF NOT EXISTS alunos(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    idade INT NOT NULL,
    telefone INT NOT NULL,
    nivel VARCHAR(50) NOT NULL,
    horario VARCHAR(50) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
    );
    `;
    db.query(criarTabelaSQL, (erroTabela) => {
        if(erroTabela){
            console.log("Erro de verificação ou criação da tabela", erroTabela);
        } else {
            console.log("Tabela pronta para uso");
        }
    })
});

app.get("/", (req, res) => {
    res.json({
        mensagem: "API Funcionando."
    })
})

app.post("/alunos", (req, res) => {
    const{
        nome, idade, telefone, nivel, horario
    } = req.body
        if(!nome || !idade || !telefone || !nivel || !horario){
            return res.status(400).json({
                erro: "Preencha todos os campos."
            })
        }
        if(idade < 5){
            return res.status(400).json({
                 erro: "O aluno deve ter 5 anos ou mais."
            })
        }
        if(idade > 100){
            return res.status(400).json({
                 erro: "O aluno deve ter menos de 100 anos."
            })
        }
        if(nome.length < 3){
            return res.status(400).json({
                 erro: "O nome deve possuir mais de 3 caracteres."
            })
        }
        
        const verificaSQL = "select * from alunos where nome = ?";
        db.query(verificaSQL, [nome], (erro, resultado) =>{
            if(erro){
                return res.status(500).json(erro);
            }
            if(resultado.legth > 0){
                return res.status(400).json({
                    erro: "Já existe este nome cadastrado no banco"
                })
            }
            const inserirSQL = `insert into alunos (nome, idade, telefone, nivel, horario) values(?, ?, ?, ?, ?)`;
            db.query(inserirSQL, [nome, idade, telefone, nivel, horario], (erro, resultado) => {
                if(erro){
                    return res.status(500).json(erro);
                }
                res.status(201).json({
                    mensagem: "Aluno cadastrado",
                    id: resultado.insertId
                });
            });
        });    
});

app.get("/alunos", (req, res) => {
    db.query(
        "select * from alunos", (erro, resultado) => {
            if(erro){
                return res.status(500).json(erro);
            }
            res.json(resultado);
        });
});

app.delete("/alunos/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from alunos where id = ?", [id], (erro, resultado) => {
        if(erro){
            return res.status(500).json(erro);
        } if (resultado.affectedRows === 0){
            return res.status(404).json({
                erro: "Aluno não encontrado"
            })
        }
        res.json({
            mensagem: "Aluno removido"
        });
    });
});

app.put("/alunos/:id", (req, res) => {
    const id = req.params.id;
    db.query("select ativo from alunos where id = ?", [id], (erro, resultado) =>{
        if(erro){
            return res.status(500).json(erro);
        }
        if(resultado.length === 0){
            return res.status(404).json({
                erro: "Aluno não encontrado"
            });
        }
        const novoStatus = resultado[0].ativo ? 0:1;
        db.query("update alunos set ativo = ? where id = ?", [novoStatus, id], (erro) =>{
            if(erro){
                return res.status(500).json(erro);
            }
            res.json({
                mensagem: "Aluno atualizado"
            });
        });
    });
});

let incorretas = 0;
let bloqueado = false;

app.post("/admin", (req, res) => {
    const {senha} = req.body; 
    if(bloqueado === true){
        return res.status(403).json({
            erro: "Tentativas excedidas."
        })
    } 
        if(!senha){
        return res.status(400).json({
            erro: "Informe a senha."
        })
    }
    if(senha === "admin123"){
        incorretas = 0
        return res.json({autenticado: true});
    }
    incorretas++;
    if(incorretas >= 3){
        bloqueado = true;
        return res.status(403).json({
            erro: "Sistema bloqueado."
        })
    }
    return res.status(401).json({
        erro: "Senha incorreta."
    })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando em: ")
    console.log(`porta ${PORT}`)
})
