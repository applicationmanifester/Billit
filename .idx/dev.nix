      {pkgs}: {
        channel = "stable-24.05";
        packages = [
          pkgs.nodejs_22,
          pkgs.docker_27
        ];
        idx.extensions = [
          "svelte.svelte-vscode",
          "vue.volar"
        ];
        idx.previews = {
          previews = {
            web = {
              command = [
                "npm",
                "run",
                "dev",
                "--",
                "--port",
                "$PORT",
                "--host",
                "0.0.0.0"
              ];
              manager = "web";
            };
          };
        };
      }
