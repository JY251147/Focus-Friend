# 学习助手 (Learn Assistant)

一款集成了专注计时器和 AI 辅导功能的渐进式 Web 应用（PWA），旨在帮助学生提高学习效率和专注度。

## ✨ 主要功能

- **AI 智能对话**: 基于大语言模型，提供学习辅导、问题解答、知识扩展等功能。
- **专注计时器**: 一个基于番茄工作法的计时器，帮助用户更好地管理学习和休息时间。
- **语音输入/输出**: 支持通过麦克风进行语音输入，并能朗读 AI 的回答。
- **作业检查 (开发中)**: 预留了通过拍照检查作业的功能入口。

## 🛠️ 技术栈

- **后端**: Python 3, FastAPI
- **前端**: HTML, CSS, JavaScript (原生)
- **AI 模型**: DeepSeek API (可替换为其他兼容 OpenAI 格式的 API)

---

## 🐳 使用 Docker 运行 (推荐)

这是最推荐的部署方式，它可以保证在任何机器上都有一致的运行环境，并简化了安装流程。

### 1. 系统环境准备

确保您的电脑上已经安装了 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

### 2. 配置 API Key

和手动安装一样，您需要先配置好 API Key。

1.  在项目根目录下，将 `.env.example` 文件复制一份，并重命名为 `.env`。
2.  编辑 `.env` 文件，填入您的 API 密钥，并设置您想使用的 `DEFAULT_MODEL`。

### 3. 构建并运行 Docker 容器

打开您的命令提示符 (CMD) 或 PowerShell，执行以下命令：

**第一步：构建 Docker 镜像**

此命令会根据 `Dockerfile` 的定义，创建一个名为 `learn-assistant` 的本地镜像。

```bash
docker build -t learn-assistant .
```

**第二步：运行 Docker 容器**

```bash
docker run -d -p 5000:5000 --name learn-assistant-container --env-file .env learn-assistant
```

命令解释：
- `-d`: 在后台以分离模式运行容器。
- `-p 5000:5000`: 将您电脑的 5000 端口映射到容器的 5000 端口。
- `--name learn-assistant-container`: 为容器指定一个易于记忆的名称。
- `--env-file .env`: **(关键)** 将 `.env` 文件中的所有环境变量（特别是 API Key）安全地注入到容器中。
- `learn-assistant`: 指定使用哪个镜像来创建容器。

### 4. 访问与管理

- **访问应用**: 容器启动后，直接在浏览器中访问 `http://localhost:5000`。
- **查看日志**: 如果需要排查问题，可以使用以下命令查看容器的实时日志。
  ```bash
  docker logs -f learn-assistant-container
  ```
- **停止容器**: 当您想停止应用时，执行以下命令。
  ```bash
  docker stop learn-assistant-container
  ```
- **移除容器**: 如果您想彻底删除容器（例如为了重新运行），可以先停止，再移除。
  ```bash
  docker rm learn-assistant-container
  ```

---

## 🚀 手动安装和运行

如果您不想使用 Docker，也可以遵循以下传统步骤进行安装。

### 1. 系统环境准备

1.  **Python 3**: 请从 [Python 官网](https://www.python.org/downloads/) 下载并安装。
2.  **Git**: 请从 [Git 官网](https://git-scm.com/downloads/) 下载并安装。

### 2. 安装与配置步骤

1.  **克隆代码**: `git clone <您的 GitHub 仓库地址>`
2.  **进入目录**: `cd learn-assistant-pwa`
3.  **创建并激活虚拟环境**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```
4.  **安装依赖**: `pip install -r requirements.txt`
5.  **配置 API Key**: 复制 `.env.example` 为 `.env`，并填入您的密钥。

### 3. 启动与访问

- **启动服务**: `python server.py`
- **本机访问**: `http://localhost:5000`
- **局域网访问**: `http://<您的局域网IP>:5000`

---

## 📂 项目文件结构

```
.learn-assistant-pwa/
├── .dockerignore      # 定义了 Docker 构建时应忽略的文件
├── .gitignore         # 定义了 Git 应忽略的文件
├── Dockerfile         # Docker 镜像定义文件
├── .env.example       # API 密钥配置模板
├── README.md          # 本说明文档
├── requirements.txt   # Python 依赖列表
├── server.py          # FastAPI 后端服务
├── index.html         # 应用主页面
├── app.js             # 前端核心逻辑
└── ...
```