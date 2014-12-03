// DISASSEMBLKER PANEL
var DisasmPanel = function () {
  this.display = "flat";
  this.min = 0;
  this.max = 0;
  this.block = 512;
  this.base = "entry0";
  this.selected = null;
  this.selected_offset = null;
  this.renaming = null;
  this.renameOldValue = "";
  this.rbox = null;
  this.panel = $("#disasm_tab")[0];
};
DisasmPanel.prototype.seek = function(addr, scroll) {
    var panel = this.panel;
    if (this.display === "graph") {
      var display = "graph";
      panel.innerHTML = "";
      r2.store_asm_config();
      r2.cmd("e asm.bytes = false; e asm.flags = false; e asm.functions = false; e asm.lines = false; e asm.xrefs = false; e asm.cmtright = true; e asm.pseudo = false", function (x) {
        r2.cmd ("agj " + addr, function(x) {
          panel.innerHTML = "<div id='bb_canvas' class='bbcanvas enyo-selectable ec_background'></div>";
          // If render fails (address does not belong to function) then switch to flat view
          if (render_graph(x) === false) display = "flat";
        });
      });

      this.display = display;
      r2.restore_asm_config();
    }
    else if (this.display === "flat") {
      this.min = this.max = 0;
      r2.get_disasm_before_after(addr, -0.5*this.block, this.block, function(x) {
        panel.innerHTML = "<div id='flat_canvas' class='flatcanvas enyo-selectable ec_background'></div>";
        render_instructions(x);
      });
    }
    this.selected = get_element_by_address(addr);
    this.selected_offset = addr;

    render_history();
    rehighlight_iaddress(addr);

};
DisasmPanel.prototype.display_graph = function() {
  this.display = "graph";
  $("#main_panel").removeClass("ec_background");
  $("#main_panel").addClass("ec_alt_background");
};
DisasmPanel.prototype.display_flat = function() {
  this.display = "flat";
  $("#main_panel").removeClass("ec_alt_background");
  $("#main_panel").addClass("ec_background");
};
DisasmPanel.prototype.goToAddress = function() {

  if (this.renaming === null && this.selected !== null && (this.selected.className.indexOf(" addr ") > -1)) {
    var address = get_address_from_class(this.selected);
    if (this.selected.className.indexOf("ec_dataoffset") > -1) {
      // address is located in not executable memory, switching to hex view
      r2ui.openpage(address, 2);
      return;
    }
    if (address !== undefined && address !== null) {
      address = address_canonicalize(address);
      do_jumpto(address);
    }
  }
};
DisasmPanel.prototype.handleInputTextChange = function() {
  if (this.renaming !== null && this.rbox.value.length > 0) {
    // Enter belongs to renaming
    var new_value = this.rbox.value;
    this.renaming.innerHTML = new_value;
    renaming = null;

    this.renaming.innerHTML = this.renameOldValue;
    this.renaming = null;

    var renamed = false;
    var offset = this.selected_offset;
    // If current offset is the beggining of a function, rename it with afr
    r2.cmdj("pdfj", function(x) {
      if (x !== null && x !== undefined) {
        if ("0x" + x.addr.toString(16) === offset) {
          r2.cmd("afn " + new_value, function() {
            renamed = true;
           });
        }
      }
    });
    // Otherwise just add a flag
    if (!renamed) {
      var labels = '';
      r2.cmd("fs functions;f@" + this.selected_offset + "~[2]", function(x) {
        labels = x.trim().replace('\n', ';');
      });
      if (new_value) {
        var cmd = "fs functions;f-@" + this.selected_offset + ";f+" + new_value + "@" + this.selected_offset + ";";
        r2.cmd(cmd, function() {});
      } else {
        r2.cmd("f-@" + this.selected_offset, function() {});
      }
    }
    r2.update_flags();

    var instruction;
    if (this.display == "flat") instruction = $(this.selected).closest(".instructionbox").find('.insaddr')[0];
    if (this.display == "graph") instruction = $(this.selected).closest(".instruction").find('.insaddr')[0];
    var address = get_address_from_class(instruction);
    update_binary_details();
    r2ui.seek(address, false);
    scroll_to_address(address);
    document.getElementById("canvas").focus();
  }
};