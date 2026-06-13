{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  packages = [
    pkgs.git
  ];

  processes.brama-web.exec = "npm run dev:web";
  processes.brama-be.exec = "npm run dev:api";

  enterShell = ''
    echo "Brama dev environment"
    echo "Run npm install, then npm run dev or devenv up."
  '';
}
