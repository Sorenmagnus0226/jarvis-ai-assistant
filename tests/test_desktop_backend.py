import unittest

from fastapi.testclient import TestClient

from backend.main import app


class KaizenDesktopBackendSmokeTests(unittest.TestCase):
    def test_health_endpoint_reports_ready(self):
        response = TestClient(app).get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_provider_endpoint_has_expected_provider_catalog(self):
        response = TestClient(app).get("/api/providers")
        self.assertEqual(response.status_code, 200)
        providers = {item["name"] for item in response.json()["providers"]}
        self.assertTrue({"openai", "claude", "gemini", "ollama", "groq", "deepseek", "openrouter"}.issubset(providers))

    def test_frontend_is_served_by_backend(self):
        response = TestClient(app).get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("KAIZEN", response.text)


if __name__ == "__main__":
    unittest.main()
