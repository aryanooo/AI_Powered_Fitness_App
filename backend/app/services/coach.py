from textwrap import dedent

from app.models import FitnessPlan, FitnessPlanCreate, User, UserProfile
from app.services.llm import LLMService


class CoachService:
    def __init__(self) -> None:
        self.llm_service = LLMService()

    def _build_template_plan(
        self,
        plan_type: str,
        goal: str,
        days: int,
        experience: str,
        dietary_preference: str,
        notes: str | None,
    ) -> str:
        if plan_type == "diet":
            return dedent(
                f"""
                Goal: {goal}
                Training experience: {experience}
                Dietary preference: {dietary_preference}

                Daily structure:
                - Breakfast: protein + complex carbs + fruit
                - Lunch: lean protein + vegetables + rice/roti
                - Snack: yogurt, nuts, or protein shake
                - Dinner: lighter protein-focused meal with vegetables

                Coaching notes:
                - Prioritize hydration and fiber intake.
                - Keep protein intake consistent across meals.
                - Adjust portion sizes based on weekly weight and energy trends.
                - Maintain a sustainable calorie deficit or surplus instead of drastic cuts.

                Personal note: {notes or "No extra notes provided."}
                """
            ).strip()
        return dedent(
            f"""
            Goal: {goal}
            Training experience: {experience}
            Preferred workout days per week: {days}

            Weekly split:
            - Day 1: Upper body push + core
            - Day 2: Lower body strength
            - Day 3: Active recovery or light cardio
            - Day 4: Upper body pull + conditioning
            - Day 5: Full body hypertrophy

            Programming notes:
            - Warm up for 8 to 10 minutes before lifting.
            - Progress weight or reps gradually every 1 to 2 weeks.
            - Keep 1 to 2 reps in reserve on most working sets.
            - Sleep at least 7 hours for recovery.

            Personal note: {notes or "No extra notes provided."}
            """
        ).strip()

    async def build_plan(
        self,
        user: User,
        profile: UserProfile | None,
        plan_in: FitnessPlanCreate,
        recent_workout_plan: FitnessPlan | None = None,
    ) -> dict[str, str]:
        goal = plan_in.goal_override or (
            profile.goal if profile and profile.goal else "general fitness"
        )
        days = (
            profile.preferred_workout_days if profile and profile.preferred_workout_days else 4
        )
        experience = (
            profile.experience_level if profile and profile.experience_level else "beginner"
        )
        dietary_preference = (
            profile.dietary_preference if profile and profile.dietary_preference else "balanced"
        )
        plan_type = plan_in.plan_type.lower()

        title = f"{goal.title()} {plan_type.title()} Plan"
        summary = (
            f"{plan_type.title()} plan for {user.full_name or user.email}, built around "
            f"{goal}, {days} workout days per week, and an {experience} training level."
        )

        include_workout_context = (
            plan_type == "diet"
            and plan_in.include_workout_context
            and recent_workout_plan is not None
        )
        if include_workout_context:
            summary = (
                f"{summary} Uses the most recent workout plan as nutrition context."
            )

        workout_context = ""
        if include_workout_context and recent_workout_plan:
            trimmed_plan = recent_workout_plan.content[:1600].strip()
            workout_context = dedent(
                f"""
                Most recent workout plan title: {recent_workout_plan.title}
                Most recent workout plan summary: {recent_workout_plan.summary}
                Most recent workout plan details (excerpt):
                {trimmed_plan or "No workout plan details were provided."}
                """
            ).strip()

        profile_summary = dedent(
            f"""
            User: {user.full_name or user.email}
            Goal: {goal}
            Activity level: {profile.activity_level if profile and profile.activity_level else "not set"}
            Experience: {experience}
            Dietary preference: {dietary_preference}
            Injuries: {profile.injuries if profile and profile.injuries else "none shared"}
            Preferred workout days: {days}
            Notes from user: {plan_in.notes or "No extra notes provided."}
            """
        ).strip()

        system_prompt = (
            "You are an evidence-based AI fitness coach. Produce clear, structured, "
            "actionable plans. Avoid medical claims, include sensible safety guidance, "
            "and keep the plan concise but practical."
        )
        prompt = dedent(
            f"""
            Create a {plan_type} plan for the user below.

            Fitness profile:
            {profile_summary}
            """
        ).strip()

        if include_workout_context:
            prompt = f"{prompt}\n\nWorkout plan context:\n{workout_context}"

        prompt = dedent(
            f"""
            {prompt}

            Output requirements:
            - Use Markdown with short headings.
            - Include a quick overview, the main plan, and 4-6 bullets of coaching notes.
            - For workout plans: list a weekly split with exercises, sets, and reps.
            - For diet plans: include macro targets, meal timing, and a 1-day sample menu.
            - Keep the total response under ~900 words.
            """
        ).strip()

        if self.llm_service.is_configured:
            try:
                content = await self.llm_service.generate_coaching_response(
                    prompt, system_prompt=system_prompt
                )
            except Exception:
                content = self._build_template_plan(
                    plan_type, goal, days, experience, dietary_preference, plan_in.notes
                )
                summary = f"{summary} (AI unavailable, template used.)"
        else:
            content = self._build_template_plan(
                plan_type, goal, days, experience, dietary_preference, plan_in.notes
            )
            summary = f"{summary} (AI not configured, template used.)"

        return {"title": title, "summary": summary, "content": content}

    async def answer_question(
        self,
        user: User,
        profile: UserProfile | None,
        question: str,
        retrieved_chunks: list[dict[str, object]],
    ) -> str:
        profile_summary = dedent(
            f"""
            User: {user.full_name or user.email}
            Goal: {profile.goal if profile and profile.goal else "not set"}
            Activity level: {profile.activity_level if profile and profile.activity_level else "not set"}
            Experience: {profile.experience_level if profile and profile.experience_level else "not set"}
            Dietary preference: {profile.dietary_preference if profile and profile.dietary_preference else "not set"}
            Injuries: {profile.injuries if profile and profile.injuries else "none shared"}
            """
        ).strip()
        context = "\n\n".join(
            f"[{chunk['title']}] {chunk['text']}" for chunk in retrieved_chunks
        ) or "No uploaded knowledge base context matched this question."

        prompt = dedent(
            f"""
            Fitness profile:
            {profile_summary}

            Knowledge base context:
            {context}

            User question:
            {question}

            Respond with:
            1. Direct answer
            2. Practical action steps
            3. Safety note if needed
            """
        ).strip()

        return await self.llm_service.generate_coaching_response(prompt)
