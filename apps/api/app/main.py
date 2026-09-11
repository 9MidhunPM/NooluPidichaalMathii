from fastapi import FastAPI


def create_app() -> FastAPI:
    """Build the API application without opening external connections."""
    app = FastAPI(
        title="Noolu Pidichaal Mathi API",
        version="0.0.0",
    )

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        """Report process liveness without checking dependencies."""
        return {"status": "ok"}

    return app


app = create_app()
