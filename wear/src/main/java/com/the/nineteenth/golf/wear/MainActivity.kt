package com.the.nineteenth.golf.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.the.nineteenth.golf.wear.ui.WearApp

/// Entry point for the Wear OS companion. Spec 1 hosts a static scaffold; the
/// Data Layer bridge and real screens arrive in later specs.
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { WearApp() }
    }
}
