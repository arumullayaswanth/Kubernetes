

## ✅ 1. Download `vcluster` correctly (PowerShell )

PowerShell’s `curl` is actually `Invoke-WebRequest`, so `-L` won’t work.

Use this instead:

```powershell
Invoke-WebRequest -Uri "https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-windows-amd64.exe" -OutFile "vcluster.exe"
```

---

## ✅ 2. Move it to your bin folder

Your `bin` folder already exists, so just move the file:

```powershell
Move-Item .\vcluster.exe "$HOME\bin\vcluster.exe"
```

---

## ✅ 3. Add bin folder to PATH (PowerShell way)

Instead of `.bashrc`, use Windows environment variables:

```powershell
[Environment]::SetEnvironmentVariable(
  "Path",
  $env:Path + ";$HOME\bin",
  [EnvironmentVariableTarget]::User
)
```

👉 Then **restart PowerShell** (important!)

---

## ✅ 4. Verify installation

Open a new PowerShell window and run:

```powershell
vcluster --version
```

---
