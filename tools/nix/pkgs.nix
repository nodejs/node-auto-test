arg:
let
  repo = "https://github.com/NixOS/nixpkgs";
  rev = "f82ce7af0b79ac154b12e27ed800aeb97413723c";
  nixpkgs = import (builtins.fetchTarball {
    url = "${repo}/archive/${rev}.tar.gz";
    sha256 = "0dkkyyk3y8g1a7fs4rv3lqrsmxf60vrk3q93wl7yl6ggjgds79id";
  }) arg;
in
nixpkgs
// {
  nixfmt-tree = nixpkgs.nixfmt-tree.overrideAttrs (old: {
    patches = (old.patches or [ ]) ++ [
      (nixpkgs.fetchpatch2 {
        url = "https://github.com/numtide/treefmt/pull/678.patch?full_index=1";
        hash = "sha256-VJlOgsVvgYckYc+9e3xODl+qFQH/SYGjsmUpZ5YlGNM=";
      })
    ];
  });
}
