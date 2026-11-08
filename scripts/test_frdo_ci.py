import importlib.util, json, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('gate',Path(__file__).with_name('check_frdo_ci.py'))
gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
class ExecutionProofTests(unittest.TestCase):
    def test_real_unit_counts(self):
        self.assertEqual(gate.verify_unit('# tests 120\n# pass 120\n# fail 0\n# skipped 0\n# cancelled 0')['pass'],120)
    def test_empty_failed_skipped_or_missing_unit_fails(self):
        for text in ['', '# tests 0\n# pass 0', '# tests 120\n# pass 111\n# fail 1', '# tests 120\n# pass 120\n# fail 0\n# skipped 1\n# cancelled 0']:
            with self.assertRaises(ValueError):gate.verify_unit(text)
    def test_browser_requires_evidence_and_matching_count(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)
            with self.assertRaises(FileNotFoundError):gate.verify_browser(p,'creation','PASS 81 checks')
            (p/'browser-evidence.json').write_text(json.dumps({'checks':['case']*81,'errors':[]}))
            self.assertEqual(gate.verify_browser(p,'creation','PASS 81 checks'),81)
            with self.assertRaises(ValueError):gate.verify_browser(p,'creation','PASS 0 checks')
    def test_browser_errors_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);(p/'browser-evidence.json').write_text(json.dumps({'checks':['case']*81,'errors':['boom']}))
            with self.assertRaises(ValueError):gate.verify_browser(p,'creation','PASS 81 checks')
    def test_incomplete_operator_cycle_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);(p/'browser-evidence.json').write_text(json.dumps({'checks':['case']*119,'runs':[{}]*23,'completeOperatorCycle':False}))
            with self.assertRaises(ValueError):gate.verify_browser(p,'operator','PASS 119 checks')
if __name__=='__main__':unittest.main()
