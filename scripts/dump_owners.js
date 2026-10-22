// Dump every pool string for the owners that contain player-visible text.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const mapped = new Set(Object.keys(map));

const owners = [
  'obj_mouse_input_handler', 'obj_output_paper', 'obj_input_paper', 'obj_decoded_message_paper',
  'obj_teleprinter_message', 'obj_teleprinter_paper', 'obj_teletyper_controller',
  'obj_msg_radial_trefoil', 'obj_transcript', 'obj_wishlist_message', 'obj_roster_controller',
  'obj_sv_secret_drawer', 'obj_gas_mask_container_item', 'obj_dornier_24_intro',
  'scr_execute_step_actions', 'scr_get_dialog_list', 'scr_do_render_page', 'scr_manual_render_page',
  'scr_msg_crumble_operation', 'obj_mission_controller', 'obj_statement_paper_renderer',
  'obj_mm_menu_background', 'obj_endless_tutorial', 'scr_demo_day_rules', 'scr_action_start_mission',
  'obj_demo_finish_controller', 'scr_wishlist_message', 'obj_daily_orders_text_content',
];
const out = [];
for (const o of owners) {
  const rows = items.filter(it => it.owner && it.owner.includes(o));
  if (!rows.length) { out.push(`== ${o}: (none)`); continue; }
  out.push(`== ${o}  (${rows.length})`);
  for (const it of rows) {
    out.push(`   ${mapped.has(it.s) ? 'MAPPED' : '      '} 0x${it.off.toString(16)} ${JSON.stringify(it.s)}`);
  }
}
const p = path.join(root, 'extracted', 'visible_owners.txt');
fs.writeFileSync(p, out.join('\n'), 'utf8');
console.log('-> ' + p + ' (' + out.length + ' lines)');
